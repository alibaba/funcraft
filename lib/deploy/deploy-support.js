'use strict';

const fs = require('fs');
const util = require('util');

const Log = require('@alicloud/log');
const FC = require('@alicloud/fc2');
const Pop = require('@alicloud/pop-core');
const CloudAPI = require('@alicloud/cloudapi');
const TableStore = require('tablestore');

const getProfile = require('../profile').getProfile;
const pkg = require('../../package.json');
const zip = require('../package/zip');
const debug = require('debug')('fun:deploy');
const osLocale = require('os-locale');
const MNSClient = require('@alicloud/mns');
const path = require('path');
const { processApiParameters } = require('./deploy-support-api');

const hashedMachineId = require('node-machine-id').machineId;

const promiseRetry = require('../retry');

const funignore = require('../package/ignore');

const ram = require('../ram');

const readFile = util.promisify(fs.readFile);

const { green, red } = require('colors');
const { addEnv } = require('../install/env');

const getFcClient = async () => {
  const profile = await getProfile();

  const locale = await osLocale();

  const mid = await hashedMachineId();

  return new FC(profile.accountId, {
    accessKeyID: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    region: profile.defaultRegion,
    timeout: profile.timeout * 1000,
    headers: {
      'user-agent': `${pkg.name}/v${pkg.version} ( Node.js ${process.version}; OS ${process.platform} ${process.arch}; language ${locale}; mid ${mid})`
    }
  });
};

const getOtsClient = async (instanceName) => {
  const profile = await getProfile();

  var endpoint = `http://${instanceName}.${profile.defaultRegion}.ots.aliyuncs.com`;
  return new TableStore.Client({
    accessKeyId: profile.accessKeyId,
    secretAccessKey: profile.accessKeySecret,
    endpoint: endpoint,
    instancename: instanceName
  });
};


const getMnsClient = async (topicName, region) => {
  const profile = await getProfile();

  return new MNSClient(profile.accountId, {
    region: region,
    accessKeyId: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    // optional & default
    secure: false, // use https or http
    internal: false, // use internal endpoint
    vpc: false // use vpc endpoint
  });

};

const getPopClient = async () => {
  const profile = await getProfile();

  return new Pop({
    endpoint: `http://ots.${profile.defaultRegion}.aliyuncs.com`,
    apiVersion: '2016-06-20',
    accessKeyId: profile.accessKeyId,
    secretAccessKey: profile.accessKeySecret,
    opts: {
      timeout: profile.timeout * 1000
    }
  });
};

const getCloudApiClient = async () => {
  const profile = await getProfile();

  return new CloudAPI({
    accessKeyId: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    endpoint: `http://apigateway.${profile.defaultRegion}.aliyuncs.com`,
    opts: {
      timeout: profile.timeout * 1000
    }
  });
};


const getSlsClient = async () => {
  const profile = await getProfile();

  return new Log({
    region: profile.defaultRegion,
    accessKeyId: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
  });
};

async function makeLogstoreIndex(projectName, logstoreName) {
  const sls = await getSlsClient();

  // create index if index not exist.
  console.log(`\t\tWaiting for log service logstore ${logstoreName} default index to be deployed...`);
  await promiseRetry(async (retry, times) => {
    try {
      try {
        await sls.getIndexConfig(projectName, logstoreName);
        return;
      } catch (ex) {
        if (ex.code !== 'IndexConfigNotExist') {
          debug('error when getIndexConfig, projectName is %s, logstoreName is %s, error is: \n%O', projectName, logstoreName, ex);

          throw ex;
        }
      }

      // create default logstore index. index configuration is same with sls console.
      debug('logstore index not exist, try to create a default index for project %s logstore %s', projectName, logstoreName);
      await sls.createIndex(projectName, logstoreName, {
        ttl: 10,
        line: {
          caseSensitive: false,
          chn: false,
          token: [...', \'";=()[]{}?@&<>/:\n\t\r']
        }
      });
      debug('create default index success for project %s logstore %s', projectName, logstoreName);
    } catch (ex) {
      debug('error when createIndex, projectName is %s, logstoreName is %s, error is: \n%O', projectName, logstoreName, ex);

      console.log(red(`\t\t\tretry ${times} times`));
      retry(ex);
    }
  });

  console.log(green(`\t\tlog service logstore ${logstoreName} default index deploy success`));
}

async function makeLogstore({
  projectName,
  logstoreName,
  ttl,
  shardCount
}) {
  const sls = await getSlsClient();

  let exists = true;
  await promiseRetry(async (retry, times) => {
    try {
      await sls.getLogStore(projectName, logstoreName);
    } catch (ex) {
      if (ex.code !== 'LogStoreNotExist') {
        debug('error when getLogStore, projectName is %s, logstoreName is %s, error is: \n%O', projectName, logstoreName, ex);

        console.log(red(`\t\tretry ${times} times`));

        retry(ex);
      } else { exists = false; }
    }
  });

  if (!exists) {
    await promiseRetry(async (retry, times) => {
      try {
        await sls.createLogStore(projectName, logstoreName, {
          ttl,
          shardCount
        });
      } catch (ex) {
        debug('error when createLogStore, projectName is %s, logstoreName is %s, error is: \n%O', projectName, logstoreName, ex);
        console.log(red(`\t\tretry ${times} times`));
        retry(ex);
      }
    });
  } else {
    await promiseRetry(async (retry, times) => {
      try {
        await sls.updateLogStore(projectName, logstoreName, {
          ttl,
          shardCount
        });
      } catch (ex) {
        debug('error when updateLogStore, projectName is %s, logstoreName is %s, error is: \n%O', projectName, logstoreName, ex);

        if (ex.code !== 'ParameterInvalid' && ex.message !== 'no parameter changed') {
          console.log(red(`\t\tretry ${times} times`));
          retry(ex);
        } else {
          throw ex;
        }
      }
    });
  }
}

async function makeSlsProject(projectName, description) {
  const sls = await getSlsClient();

  let projectExist = true;

  await promiseRetry(async (retry, times) => {
    try {
      await sls.getProject(projectName);
    } catch (ex) {
      if (ex.code === 'Unauthorized') {
        console.log(red(`Log Service '${projectName}' may create by others, you should use a unique project name.`));
        process.exit(-1);
      } else if (ex.code !== 'ProjectNotExist') {
        debug('error when getProject, projectName is %s, error is: \n%O', projectName, ex);

        console.log(red(`\tretry ${times} times`));
        retry(ex);
      } else { projectExist = false; }
    }

    if (projectExist) {
      // no update project api
      // only description can be updated by console.
      debug(`sls project exists, but could not be updated`);
    } else {
      try {
        await sls.createProject(projectName, {
          description
        });
      } catch (ex) {
        if (ex.code === 'ProjectAlreadyExist') {
          console.error(red(`error: sls project ${projectName} already exist, it may be in other region or created by other users.`));
          process.exit(-1);
        } else {
          debug('error when createProject, projectName is %s, error is: \n%O', projectName, ex);

          console.log(red(`\tretry ${times} times`));
          retry(ex);
        }
      }
    }
  });
}

async function makeMnsTopic(topicName, properties) {
  var region = properties.Region;
  const mnsClient = await getMnsClient(topicName, region);

  // just for deepping copy
  var params = JSON.parse(JSON.stringify(properties));
  delete params.Region;

  await promiseRetry(async (retry, times) => {
    try {
      let res;
      res = await mnsClient.createTopic(topicName, params);
      console.log('mms create topic response status code = ', res.code);
    } catch (ex) {
      console.log(red(`\tretry ${times} times`));
      retry(ex);
    }
  });
}

async function makeService({
  serviceName,
  role,
  description,
  internetAccess = true,
  logConfig,
  vpcConfig,
  nasConfig
}) {
  const fc = await getFcClient();

  var service;
  await promiseRetry(async (retry, times) => {
    try {
      service = await fc.getService(serviceName);
    } catch (ex) {
      if (ex.code === 'AccessDenied') {
        throw ex;
      } else if (ex.code !== 'ServiceNotFound') {
        debug('error when getService, serviceName is %s, error is: \n%O', serviceName, ex);

        console.log(red(`\tretry ${times} times`));
        retry(ex);
      }
    }
  });

  const options = {
    description,
    role,
    logConfig: {
      project: logConfig.Project || '',
      logstore: logConfig.Logstore || ''
    }
  };

  if (internetAccess !== null) {
    // vpc feature is not supported in some region
    Object.assign(options, {
      internetAccess
    });
  }

  if (vpcConfig) {
    Object.assign(options, {
      vpcConfig
    });
  }

  if (nasConfig) {
    Object.assign(options, {
      nasConfig
    });
  }

  await promiseRetry(async (retry, times) => {
    try {
      if (!service) {
        debug('create service %s, options is %j', serviceName, options);
        service = await fc.createService(serviceName, options);
      } else {
        debug('update service %s, options is %j', serviceName, options);
        service = await fc.updateService(serviceName, options);
      }
    } catch (ex) {
      debug('error when createService or updateService, serviceName is %s, options is %j, error is: \n%O', serviceName, options, ex);

      console.log(red(`\tretry ${times} times`));
      retry(ex);
    }
  });

  return service;
}

function generateFunIngore(baseDir, codeUri) {
  const absCodeUri = path.resolve(codeUri);
  const absBaseDir = path.resolve(baseDir);

  const relative = path.relative(absBaseDir, absCodeUri);

  if (codeUri.startsWith('..') || relative.startsWith('..')) {
    console.warn(red(`\t\twarning: funignore is not supported for your CodeUri: ${codeUri}`));
    return null;
  }

  return funignore(baseDir);
}

async function getFunCodeAsBase64(baseDir, codeUri) {
  if (codeUri) {
    if (codeUri.endsWith('.zip') || codeUri.endsWith('.jar')) {
      return Buffer.from(await readFile(codeUri)).toString('base64');
    }
  } else {
    codeUri = './';
  }

  const ignore = generateFunIngore(baseDir, codeUri);

  return await zip.pack(codeUri, ignore);
}

function extractOssCodeUri(ossUri) {
  const prefixLength = 'oss://'.length;

  const index = ossUri.indexOf('/', prefixLength);

  return {
    ossBucketName: ossUri.substring(prefixLength, index),
    ossObjectName: ossUri.substring(index + 1)
  };
}

async function makeFunction(baseDir, {
  serviceName,
  functionName,
  description = '',
  handler,
  initializer = null,
  timeout = 3,
  initializationTimeout = 3,
  memorySize = 128,
  runtime = 'nodejs6',
  codeUri,
  environmentVariables = {}
}) {
  const fc = await getFcClient();

  var fn;
  try {
    fn = await fc.getFunction(serviceName, functionName);
  } catch (ex) {
    if (ex.code !== 'FunctionNotFound') {
      throw ex;
    }
  }

  let code;
  // oss://my-bucket/function.zip
  if (codeUri && codeUri.startsWith('oss://')) {
    code = extractOssCodeUri(codeUri);
  } else {
    console.log(`\t\tWaiting for packaging function ${functionName} code...`);
    const base64 = await getFunCodeAsBase64(baseDir, codeUri);
    console.log(green(`\t\tpackage function ${functionName} code done`));

    code = {
      zipFile: base64
    };
  }

  const params = {
    description,
    handler,
    initializer,
    timeout,
    initializationTimeout,
    memorySize,
    runtime,
    code,
    environmentVariables: addEnv(environmentVariables)
  };

  if (!fn) {
    // create
    params['functionName'] = functionName;
    fn = await fc.createFunction(serviceName, params);
  } else {
    // update
    fn = await fc.updateFunction(serviceName, functionName, params);
  }

  return fn;
}

const triggerTypeMapping = {
  'Datahub': 'datahub',
  'Timer': 'timer',
  'HTTP': 'http',
  'Log': 'log',
  'OSS': 'oss',
  'RDS': 'rds',
  'MNSTopic': 'mns_topic',
  'TableStore': 'tablestore'
};

async function getSourceArn(triggerType, triggerProperties) {
  const profile = await getProfile();

  if (triggerType === 'Log') {
    return `acs:log:${profile.defaultRegion}:${profile.accountId}:project/${triggerProperties.LogConfig.Project}`;
  } else if (triggerType === 'RDS') {
    return `acs:rds:${profile.defaultRegion}:${profile.accountId}:dbinstance/${triggerProperties.InstanceId}`;
  } else if (triggerType === 'MNSTopic') {
    if (triggerProperties.Region !== undefined) {
      return `acs:mns:${triggerProperties.Region}:${profile.accountId}:/topics/${triggerProperties.TopicName}`;
    }
    return `acs:mns:${profile.defaultRegion}:${profile.accountId}:/topics/${triggerProperties.TopicName}`;
  } else if (triggerType === 'TableStore') {
    return `acs:ots:${profile.defaultRegion}:${profile.accountId}:instance/${triggerProperties.InstanceName}/table/${triggerProperties.TableName}`;
  }

  return;
}

function getTriggerConfig(triggerType, triggerProperties) {
  if (triggerType === 'Timer') {
    return {
      payload: triggerProperties.Payload,
      cronExpression: triggerProperties.CronExpression,
      enable: triggerProperties.Enable
    };
  } else if (triggerType === 'HTTP') {
    return {
      authType: (triggerProperties.AuthType).toLowerCase(),
      methods: triggerProperties.Methods
    };
  } else if (triggerType === 'Log') {
    const logConfig = triggerProperties.LogConfig;
    const jobConfig = triggerProperties.JobConfig;
    const sourceConfig = triggerProperties.SourceConfig;

    return {
      sourceConfig: {
        logstore: sourceConfig.Logstore,
      },
      jobConfig: {
        maxRetryTime: jobConfig.MaxRetryTime,
        triggerInterval: jobConfig.TriggerInterval
      },
      logConfig: {
        project: logConfig.Project,
        logstore: logConfig.Logstore,
        functionParameter: logConfig.FunctionParameter || {}
      },
      Enable: triggerProperties.Enable || true
    };
  } else if (triggerType === 'RDS') {
    return {
      subscriptionObjects: triggerProperties.SubscriptionObjects,
      retry: triggerProperties.Retry,
      concurrency: triggerProperties.Concurrency,
      eventFormat: triggerProperties.EventFormat
    };
  } else if (triggerType === 'MNSTopic') {
    var notifyContentFormat = "STREAM";
    if (triggerProperties.NotifyContentFormat !== undefined){
      notifyContentFormat = triggerProperties.NotifyContentFormat;
    }
    var notifyStrategy = "BACKOFF_RETRY"
    if (triggerProperties.NotifyStrategy !== undefined){
      notifyStrategy = triggerProperties.NotifyStrategy;
    }
    var triggerCfg = {
      NotifyContentFormat: notifyContentFormat,
      NotifyStrategy: notifyStrategy,
    }
    if (triggerProperties.FilterTag !== undefined){
      triggerCfg.FilterTag = triggerProperties.FilterTag;
    }
    return triggerCfg;
  } else if (triggerType === 'TableStore') {
    return {};
  }
  console.error(`trigger type is ${triggerType} not supported.`);
}

async function makeInvocationRole(serviceName, functionName, triggerType) {
  if (triggerType === 'Log') {

    const invocationRoleName = ram.normalizeRoleOrPoliceName(`AliyunFcGeneratedInvocationRole-${serviceName}-${functionName}`);

    const invocationRole = await ram.makeRole(invocationRoleName, true, 'Used for fc invocation', {
      'Statement': [{
        'Action': 'sts:AssumeRole',
        'Effect': 'Allow',
        'Principal': {
          'Service': [
            'log.aliyuncs.com'
          ]
        }
      }],
      'Version': '1'
    });

    const policyName = ram.normalizeRoleOrPoliceName(`AliyunFcGeneratedInvocationPolicy-${serviceName}-${functionName}`);

    await ram.makePolicy(policyName, {
      'Version': '1',
      'Statement': [{
        'Action': [
          'fc:InvokeFunction'
        ],
        'Resource': `acs:fc:*:*:services/${serviceName}/functions/*`,
        'Effect': 'Allow'
      },
      {
        'Action': [
          'log:Get*',
          'log:List*',
          'log:PostLogStoreLogs',
          'log:CreateConsumerGroup',
          'log:UpdateConsumerGroup',
          'log:DeleteConsumerGroup',
          'log:ListConsumerGroup',
          'log:ConsumerGroupUpdateCheckPoint',
          'log:ConsumerGroupHeartBeat',
          'log:GetConsumerGroupCheckPoint'
        ],
        'Resource': '*',
        'Effect': 'Allow'
      }
      ]
    });

    await ram.attachPolicyToRole(policyName, invocationRoleName, 'Custom');
    return invocationRole.Role;

  } else if (triggerType === 'RDS' || triggerType === 'MNSTopic') {

    const invocationRoleName = ram.normalizeRoleOrPoliceName(`FunCreateRole-${serviceName}-${functionName}`);
    var tMap = {
      'RDS': 'rds',
      'MNSTopic': 'mns'
    };
    var principalService = util.format('%s.aliyuncs.com', tMap[triggerType]);

    const invocationRole = await ram.makeRole(invocationRoleName, true, 'Used for fc invocation', {
      'Statement': [{
        'Action': 'sts:AssumeRole',
        'Effect': 'Allow',
        'Principal': {
          'Service': [
            principalService
          ]
        }
      }],
      'Version': '1'
    });

    const policyName = ram.normalizeRoleOrPoliceName(`FunCreatePolicy-${serviceName}-${functionName}`);

    await ram.makePolicy(policyName, {
      'Version': '1',
      'Statement': [{
        'Action': [
          'fc:InvokeFunction'
        ],
        'Resource': `acs:fc:*:*:services/${serviceName}/functions/*`,
        'Effect': 'Allow'
      }]
    });

    await ram.attachPolicyToRole(policyName, invocationRoleName, 'Custom');

    return invocationRole.Role;

  } else if (triggerType === 'TableStore') {
    const invocationRoleName = ram.normalizeRoleOrPoliceName(`FunCreateRole-${serviceName}-${functionName}`);

    const invocationRole = await ram.makeRole(invocationRoleName, true, 'Used for fc invocation', {
      'Statement': [{
        'Action': 'sts:AssumeRole',
        'Effect': 'Allow',
        'Principal': {
          'RAM': [
            'acs:ram::1604337383174619:root'
          ]
        }
      }],
      'Version': '1'
    });

    const invkPolicyName = ram.normalizeRoleOrPoliceName(`FunCreateInvkPolicy-${serviceName}-${functionName}`);

    await ram.makePolicy(invkPolicyName, {
      'Version': '1',
      'Statement': [{
        'Action': [
          'fc:InvokeFunction'
        ],
        'Resource': '*',
        'Effect': 'Allow'
      }]
    });

    await ram.attachPolicyToRole(invkPolicyName, invocationRoleName, 'Custom');

    const otsReadPolicyName = ram.normalizeRoleOrPoliceName(`FunCreateOtsReadPolicy-${serviceName}-${functionName}`);

    await ram.makePolicy(otsReadPolicyName, {
      'Version': '1',
      'Statement': [{
        'Action': [
          'ots:BatchGet*',
          'ots:Describe*',
          'ots:Get*',
          'ots:List*'
        ],
        'Resource': '*',
        'Effect': 'Allow'
      }]
    });

    await ram.attachPolicyToRole(otsReadPolicyName, invocationRoleName, 'Custom');

    return invocationRole.Role;
  }

  return;
}

async function makeTrigger({
  serviceName,
  functionName,
  triggerName,
  triggerType,
  triggerProperties
}) {
  const fc = await getFcClient();
  var trigger;
  try {
    trigger = await fc.getTrigger(serviceName, functionName, triggerName);
  } catch (ex) {
    if (ex.code !== 'TriggerNotFound') {
      throw ex;
    }
  }

  const params = {
    triggerType: triggerTypeMapping[triggerType],
    triggerConfig: getTriggerConfig(triggerType, triggerProperties)
  };

  const invocationRole = await makeInvocationRole(serviceName, functionName, triggerType);
  if (invocationRole) {
    Object.assign(params, {
      'invocationRole': invocationRole.Arn
    });
  }

  const sourceArn = await getSourceArn(triggerType, triggerProperties);
  if (sourceArn) {
    Object.assign(params, {
      'sourceArn': sourceArn
    });
  }

  if (!trigger) {
    params.triggerName = triggerName;
    trigger = await fc.createTrigger(serviceName, functionName, params);
  } else {
    if (triggerType === 'TableStore' || triggerType === 'MNSTopic') {
      // no triggerConfig, so no updateTrigger, first delete, then create
      // await fc.deleteTrigger(serviceName, functionName, triggerName);
      // params.triggerName = triggerName;
      // trigger = await fc.createTrigger(serviceName, functionName, params);
      console.log(red(`\t\tWarning: TableStore and MNSTopic Trigger cann't update`));
      return;
    }
    trigger = await fc.updateTrigger(serviceName, functionName, triggerName, params);
  }

  return trigger;
}

async function makeCustomDomain({
  domainName,
  protocol,
  routeConfig
}) {
  const fc = await getFcClient();
  var customDomain;
  await promiseRetry(async (retry, times) => {
    try {
      customDomain = await fc.getCustomDomain(domainName);
    } catch (ex) {
      if (ex.code !== 'DomainNameNotFound') {
        debug('error when getCustomDomain, domainName is %s, error is: \n%O', domainName, ex);

        console.log(red(`\tretry ${times} times`));
        retry(ex);
      }
    }
  });

  const options = {
    protocol,
  };

  if (routeConfig) {
    Object.assign(options, {
      routeConfig
    });
  }

  await promiseRetry(async (retry, times) => {
    try {
      if (!customDomain) {
        customDomain = await fc.createCustomDomain(domainName, options);
      } else {
        customDomain = await fc.updateCustomDomain(domainName, options);
      }
    } catch (ex) {
      debug('error when createCustomDomain or updateCustomDomain, domainName is %s, options is %j, error is: \n%O', domainName, options, ex);

      console.log(red(`\tretry ${times} times`));
      retry(ex);
    }
  });

  return customDomain;
}

async function makeGroup(group) {
  const ag = await getCloudApiClient();

  const groupName = group.name;
  const groupDescription = group.description;

  var findGroup;

  await promiseRetry(async (retry, times) => {
    try {
      var groups = await ag.describeApiGroups({
        GroupName: groupName
      });

      debug(`describeApiGroups response ${JSON.stringify(groups)}`);

      var list = groups.ApiGroupAttributes.ApiGroupAttribute;
      findGroup = list.find((item) => {
        return item.GroupName === groupName;
      });

      if (!findGroup) {
        findGroup = await ag.createApiGroup({
          GroupName: groupName,
          Description: groupDescription
        });
      }

    } catch (ex) {
      debug('error when makeGroup, error is: \n%O', ex);

      console.log(red(`\tretry ${times} times`));
      retry(ex);
    }
  });

  return findGroup;
}

function getDefaultRequestConfig(method, requestPath) {
  return {
    'requestProtocol': 'HTTP',
    'postBodyDescription': '',
    'requestMode': 'PASSTHROUGH'
  };
}

async function makeApi(group, {
  stageName,
  requestPath,
  method,
  roleArn,
  apiName,
  serviceName,
  functionName,
  serviceTimeout = 3000,
  auth = {},
  visibility = 'Private',
  requestConfig = {},
  resultConfig = {},
  requestParameters = [],
  serviceParameters = [],
  serviceParametersMap = [],
  description
}) {
  await promiseRetry(async (retry, times) => {
    try {
      const ag = await getCloudApiClient();

      const result = await ag.describeApis({
        ApiName: apiName,
        GroupId: group.GroupId
      });

      debug(`describeApis response: ${JSON.stringify(result)}`);

      var apiSummarys = result.ApiSummarys && result.ApiSummarys.ApiSummary;
      var api;

      if (apiSummarys) {
        api = apiSummarys.find(summary => summary.ApiName === apiName);
      }

      const mergedRequestConfig = Object.assign(getDefaultRequestConfig(method), {
        'requestHttpMethod': method,
        'requestPath': requestPath
      }, requestConfig);

      const { apiRequestParameters, 
        apiServiceParameters, 
        apiServiceParametersMap} = processApiParameters(requestParameters, serviceParameters, serviceParametersMap);

      const profile = await getProfile();
      var params = {
        GroupId: group.GroupId,
        ApiName: apiName,
        Visibility: visibility,
        Description: description || 'The awesome api generated by fun',
        AuthType: auth.type || 'ANONYMOUS',
        RequestConfig: JSON.stringify(mergedRequestConfig),
        RequestParameters: JSON.stringify(apiRequestParameters),
        ServiceParameters: JSON.stringify(apiServiceParameters),
        ServiceParametersMap: JSON.stringify(apiServiceParametersMap),
        ServiceConfig: JSON.stringify({
          'ServiceProtocol': 'FunctionCompute',
          'ContentTypeValue': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Mock': 'FALSE',
          'MockResult': '',
          'ServiceAddress': '',
          'ServicePath': '',
          'ServiceHttpMethod': '',
          'ContentTypeCatagory': 'DEFAULT',
          'ServiceVpcEnable': 'FALSE',
          'ServiceTimeout': serviceTimeout,
          FunctionComputeConfig: {
            FcRegionId: profile.defaultRegion,
            ServiceName: serviceName,
            FunctionName: functionName,
            RoleArn: roleArn
          }
        }),
        ResultType: resultConfig.resultType || 'passthrough',
        ResultSample: resultConfig.resultSample || 'result sample',
        FailResultSample: resultConfig.failResultSample || 'failed samples'
      };

      if (auth.type === 'APPOPENID' || auth.type === 'OPENID') {
        var openidConf = auth.config || {};
        params.OpenIdConnectConfig = JSON.stringify({
          'IdTokenParamName': openidConf.idTokenParamName,
          'OpenIdApiType': openidConf.openIdApiType || 'BUSINESS',
          'PublicKeyId': openidConf.publicKeyId,
          'PublicKey': openidConf.publicKey
        });
      }

      debug('api params is %j', params);

      if (!api) {
        debug('create api');
        api = await ag.createApi(params);
      } else {
        debug('modify api');
        await ag.modifyApi(Object.assign(params, {
          ApiId: api.ApiId
        }));
      }

      debug('deploy api, params is GroupId %s, ApiId %s, StageName: %s', group.GroupId, api.ApiId, stageName);

      await ag.deployApi({
        GroupId: group.GroupId,
        ApiId: api.ApiId,
        StageName: stageName,
        Description: `deployed by fun at ${new Date().toISOString()}`
      });

      const apiDetail = await ag.describeApi({
        GroupId: group.GroupId,
        ApiId: api.ApiId
      });

      console.log('    URL: %s %s://%s%s',
        green(apiDetail.RequestConfig.RequestHttpMethod),
        apiDetail.RequestConfig.RequestProtocol.toLowerCase(),
        group.SubDomain,
        apiDetail.RequestConfig.RequestPath);
      apiDetail.DeployedInfos.DeployedInfo.forEach((info) => {
        if (info.DeployedStatus === 'DEPLOYED') {
          console.log(green(`      stage: ${info.StageName}, deployed, version: ${info.EffectiveVersion}`));
        } else {
          console.log(`      stage: ${info.StageName}, undeployed`);
        }
      });
    } catch (ex) {
      if (ex.code === 'DuplicateRequestParamaters') {
        console.error(red(ex.message));
        process.exit(-1);
      } else {
        debug('error when makeApi, error is: \n%O', ex);

        console.log(red(ex.message));
        console.log(red(`\tretry ${times} times`));
        retry(ex);
      }
      scrollTo;
    }
  });
}

async function makeApiTrigger({
  serviceName,
  functionName,
  triggerName,
  method = 'GET',
  requestPath,
  restApiId
}) {
  if (!restApiId) {
    const role = await ram.makeRole('apigatewayAccessFC');
    debug('%j', role);

    const apiGroup = await makeGroup({
      name: `fc_${serviceName}_${functionName}`,
      description: `api group for function compute ${serviceName}/${functionName}`
    });

    const apiName = `fc_${serviceName}_${functionName}_${requestPath.replace(/\//g, '_')}_${method}`;

    makeApi(apiGroup, {
      stageName: 'RELEASE',
      requestPath,
      method,
      roleArn: role.Role.Arn,
      apiName,
      serviceName,
      functionName
    });
  }
}

async function makeOtsInstance(instanceName, clusterType, description) {
  const pop = await getPopClient();

  await promiseRetry(async (retry, times) => {
    try {
      try {
        await pop.request('GetInstance', {
          'InstanceName': instanceName
        });

        return;
      } catch (ex) {
        if (ex.code === 'AuthFailed') {
          console.log(red(ex.message));
          process.exit(-1);
        } else if (ex.code !== 'NotFound') {
          throw ex;
        }
      }

      await pop.request('InsertInstance', {
        InstanceName: instanceName,
        ClusterType: clusterType,
        Description: description
      }, {
        method: 'POST'
      });
    } catch (ex) {
      if (ex.code === 'InvalidParameter' || ex.code === 'QuotaExhausted') {
        console.error(red(ex.message));
        process.exit(-1);
      } else {
        debug('error when makeOtsInstance, error is: \n%O', ex);

        console.error(red(`retry ${times} times`));
        retry(ex);
      }
    }
  });
}

async function makeOtsTable({
  instanceName,
  tableName,
  primaryKeys
}) {
  await promiseRetry(async (retry, times) => {
    try {
      const client = await getOtsClient(instanceName);

      var params = {
        tableMeta: {
          tableName: tableName,
          primaryKey: primaryKeys,
        },
        reservedThroughput: {
          capacityUnit: {
            read: 0,
            write: 0
          }
        },
        tableOptions: {
          timeToLive: -1,
          maxVersions: 1
        },
        streamSpecification: {
          enableStream: true, // default true to support tablestore trigger
          expirationTime: 1
        }
      };

      var list_data = await client.listTable();
      if (list_data.table_names.length > 0 && list_data.table_names.indexOf(tableName) !== -1) {
        console.log('tablestore table already exists, but could not be updated');
      } else {
        await client.createTable(params);
      }
    } catch (ex) {
      debug('error when makeOtsTable, error is: \n%O', ex);

      console.log(red(`retry ${times} times`));
      retry(ex);
    }
  });
}

module.exports = {
  makeApi,
  makeApiTrigger,
  makeFunction,
  makeGroup,
  makeOtsTable,
  makeOtsInstance,
  makeService,
  makeTrigger,
  makeSlsProject,
  makeLogstore,
  makeLogstoreIndex,
  makeCustomDomain,
  makeMnsTopic,
  makeInvocationRole,
  getFunCodeAsBase64
};