'use strict';

const fs = require('fs');
const util = require('util');

const Log = require('@alicloud/log');
const FC = require('@alicloud/fc2');
const ots = require('@alicloud/ots2');
const Pop = require('@alicloud/pop-core');
const CloudAPI = require('@alicloud/cloudapi');

const getProfile = require('../profile').getProfile;
const pkg = require('../../package.json');
const zip = require('../zip');
const debug = require('debug')('fun:deploy');
const osLocale = require('os-locale');

const promiseRetry = require('promise-retry');
const retryOptions = {
  retries: 6,
  factor: 2,
  minTimeout: 1 * 1000,
  randomize: true
};

let {
  makeRole, attachPolicyToRole, makePolicy
} = require('../ram');

const readFile = util.promisify(fs.readFile);

const { green, red } = require('colors');

const getFcClient = async () => {
  const profile = await getProfile();

  const locale = await osLocale();

  return new FC(profile.accountId, {
    accessKeyID: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    region: profile.defaultRegion,
    timeout: profile.timeout * 1000,
    headers: {
      'user-agent': `${pkg.name}/v${pkg.version} ( Node.js ${process.version}; OS ${process.platform} ${process.arch}; language ${locale} )`
    }
  });
};

const getOtsClient = async (instanceName) => {
  const profile = await getProfile();

  return ots.createClient({
    accessKeyID: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    instance: instanceName,
    region: profile.defaultRegion,
    keepAliveMsecs: 1000, // default 1000
    timeout: profile.timeout * 1000 
  });
};

const getPopClient = async() => {
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
        return ;
      } catch (ex) {
        if (ex.code !== 'IndexConfigNotExist') {
          throw ex;
        } 
      }

      // create default logstore index. index configuration is same with sls console.
      await sls.createIndex(projectName, logstoreName, {
        ttl: 10,
        line: {
          caseSensitive: false,
          chn: false,
          token: [...', \'";=()[]{}?@&<>/:\n\t\r']
        }
      });
    } catch (ex) {
      console.log(red(`\t\t\tretry ${times} times`));
      retry(ex);
    }
  }, retryOptions);

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
        console.log(red(`\t\tretry ${times} times`));

        retry(ex);
      } else {exists = false;}
    }
  }, retryOptions);

  if (!exists) {
    await promiseRetry(async (retry, times) => {
      try {
        await sls.createLogStore(projectName, logstoreName, {
          ttl,
          shardCount
        });
      } catch (ex) {
        console.log(red(`\t\tretry ${times} times`));
        retry(ex);
      }
    }, retryOptions);
  } else {
    await promiseRetry(async (retry, times) => {
      try {
        await sls.updateLogStore(projectName, logstoreName, {
          ttl,
          shardCount
        });
      } catch (ex) {
        if (ex.code !== 'ParameterInvalid' && ex.message !== 'no parameter changed') {
          console.log(red(`\t\tretry ${times} times`));
          retry(ex);
        }
      }
    }, retryOptions);
  }
}

async function makeSlsProject(projectName, description) {
  const sls = await getSlsClient();

  let projectExist = true;

  await promiseRetry(async (retry, times) => {
    try {
      await sls.getProject(projectName);
    } catch(ex) {
      if (ex.code === 'Unauthorized') {
        console.log(red(`Log Service '${projectName}' may create by others, you should use a unique project name.`));
        process.exit(-1);
      } else if (ex.code !== 'ProjectNotExist') {
        console.log(red(`\tretry ${times} times`));
        retry(ex);
      } else {projectExist = false;}   
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
          console.log(red(`\tretry ${times} times`));
          retry(ex);
        }
      }    
    }
  }, retryOptions);
}

async function makeService({serviceName, 
  role, 
  description, 
  internetAccess = true,
  logConfig,
  vpcConfig
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
        console.log(red(`\tretry ${times} times`));
        retry(ex);
      }
    }
  }, retryOptions);

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

  if ( vpcConfig ) {
    Object.assign(options, {
      vpcConfig
    });
  }

  await promiseRetry(async (retry, times) => {
    try {
      if (!service) {
        service = await fc.createService(serviceName, options);
      } else {
        service = await fc.updateService(serviceName, options);
      }
    } catch (ex) {
      console.log(red(`\tretry ${times} times`));
      retry(ex);
    }
  }, retryOptions);

  return service;
}

async function getFunCodeAsBase64(codeUri) {
  if (codeUri) {
    if (codeUri.endsWith('.zip') || codeUri.endsWith('.jar')) {
      return Buffer.from(await readFile(codeUri)).toString('base64');
    }
  } else {
    codeUri = './';
  }
  
  return await zip.file(codeUri);
}

function extractOssCodeUri(ossUri) {
  const prefixLength = 'oss://'.length;

  const index = ossUri.indexOf('/', prefixLength);
  
  return {
    ossBucketName: ossUri.substring(prefixLength, index),
    ossObjectName: ossUri.substring(index + 1)
  };
}

async function makeFunction({
  serviceName,
  functionName,
  description,
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
    const base64 = await getFunCodeAsBase64(codeUri);
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
    environmentVariables
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
  'OSS': 'oss'
};

async function getSourceArn(triggerType, triggerProperties) {
  const profile = await getProfile();

  if (triggerType === 'Log') {
    return `acs:log:${profile.defaultRegion}:${profile.accountId}:project/${triggerProperties.LogConfig.Project}`;
  }
  
  return ;
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
  } 
  console.error(`trigger type is ${triggerType} not supported.`);
  
}

async function makeInvocationRole(serviceName, functionName, triggerType) {
  if (triggerType === 'Log') {
    const invocationRoleName = `AliyunFcGeneratedInvocationRole-${serviceName}-${functionName}`;

    const invocationRole = await makeRole(invocationRoleName, true, 'Used for fc invocation', {
      'Statement': [
        {
          'Action': 'sts:AssumeRole',
          'Effect': 'Allow',
          'Principal': {
            'Service': [
              'log.aliyuncs.com'
            ]
          }
        }
      ],
      'Version': '1'
    });

    const policyName = `AliyunFcGeneratedInvocationPolicy-${serviceName}-${functionName}`;

    await makePolicy(policyName, {
      'Version': '1',
      'Statement': [
        {
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

    await attachPolicyToRole(policyName, invocationRoleName, 'Custom');

    return invocationRole.Role;
  }

  return ;
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
  if ( invocationRole ) {
    Object.assign(params, {
      'invocationRole': invocationRole.Arn
    });
  }

  const sourceArn = await getSourceArn(triggerType, triggerProperties);
  if ( sourceArn ) {
    Object.assign(params, {
      'sourceArn': sourceArn
    });
  }

  if (!trigger) {
    params.triggerName = triggerName;
    trigger = await fc.createTrigger(serviceName, functionName, params);
  } else {
    trigger = await fc.updateTrigger(serviceName, functionName, triggerName, params);
  }

  return trigger;
}


async function makeCustomDomain({domainName, 
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
        console.log(red(`\tretry ${times} times`));
        retry(ex);
      }
    }
  }, retryOptions);

  const options = {
    protocol, 
  };

  if ( routeConfig ) {
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
      console.log(red(`\tretry ${times} times`));
      retry(ex);
    }
  }, retryOptions);

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
      console.log(red(`\tretry ${times} times`));
      retry(ex);
    }
  }, retryOptions);

  return findGroup;
}

function getDefaultRequestConfig(method, requestPath) {
  return {
    'requestProtocol': 'HTTP',
    'postBodyDescription': '',
    'requestMode': 'PASSTHROUGH'
  };
}

function getDefaultRequestParameter() {
  return {
    'location': 'QUERY',
    'parameterType': 'String',
    'required': 'OPTIONAL'
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
  parameters = [],
  auth = {},
  visibility = 'Private',
  requestConfig = {},
  resultConfig = {},
  constantParameters,
  description
}) {
  await promiseRetry(async (retry, times) => {
    try {
      const ag = await getCloudApiClient();

      const result = await ag.describeApis({
        ApiName: apiName,
        GroupId: group.GroupId
      });
      
      var apiSummarys = result.ApiSummarys && result.ApiSummarys.ApiSummary;
      var api;

      if (apiSummarys) {
        api = apiSummarys.find(summary => summary.ApiName === apiName);
      }
    
      const requestParameters = parameters.map((item) => {
        return Object.assign(getDefaultRequestParameter(), item);
      });
    
      const serviceParameters = requestParameters.map((item) => {
        return {
          ServiceParameterName: item.apiParameterName,
          Location: item.location,
          ParameterType: item.parameterType,
          ParameterCatalog: 'REQUEST'
        };
      });
    
      const serviceParametersMap = requestParameters.map((item) => {
        return {
          ServiceParameterName: item.apiParameterName,
          RequestParameterName: item.apiParameterName
        };
      });
    
      const mergedRequestConfig = Object.assign(getDefaultRequestConfig(method), {
        'RequestHttpMethod': method,
        'RequestPath': requestPath
      }, requestConfig);
    
      const profile = await getProfile();
      var params = {
        GroupId: group.GroupId,
        ApiName: apiName,
        Visibility: visibility,
        Description: description || 'The awesome api generated by fun',
        AuthType: auth.type || 'ANONYMOUS',
        RequestConfig: JSON.stringify(mergedRequestConfig),
        RequestParameters: JSON.stringify(requestParameters),
        ServiceParameters: JSON.stringify(serviceParameters),
        ServiceParametersMap: JSON.stringify(serviceParametersMap),
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

      if (constantParameters) {
        params.ConstantParameters = JSON.stringify(constantParameters);
      }

      if (auth.type === 'APPOPENID' || auth.type === 'OPENID') {
        var openidConf = auth.config || {};
        params.OpenIdConnectConfig = JSON.stringify({
          'IdTokenParamName': openidConf.idTokenParamName,
          'OpenIdApiType': openidConf.openIdApiType || 'BUSINESS',
          'PublicKeyId': openidConf.publicKeyId,
          'PublicKey': openidConf.publicKey
        });
      }
      
      if (!api) {
        api = await ag.createApi(params);
      } else {
        await ag.modifyApi(Object.assign(params, {
          ApiId: api.ApiId
        }));
      }
      
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
        apiDetail.RequestConfig.RequestHttpMethod,
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
        console.log(red(ex.message));
        console.log(red(`\tretry ${times} times`));
        retry(ex);
      }scrollTo;
    }
  }, retryOptions);
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
    const role = await makeRole('apigatewayAccessFC');
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

        return ;
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
        console.error(red(`retry ${times} times`));
        retry(ex);
      }
    }
  }, retryOptions);
}

async function makeOtsTrigger({
  serviceName,
  functionName,
  triggerName,
  stream
}) {

  const [, , , , path] = stream.split(':');
  const [, instance, , table] = path.split('/');
  
  // todo: implement
  console.error(`Try to create OTS Trigger of /instance/${instance}/table/${table}, but the SDK didn't OK.`);
}

async function makeOtsTable({
  instanceName,
  tableName,
  primaryKeys
}) {
  await promiseRetry(async (retry, times) => {
    try {
      const client = await getOtsClient(instanceName);

      const tables = await client.listTable().catch(err => {
        if (err.errno === 'ENOTFOUND' && err.syscall === 'getaddrinfo') {
          console.error(red(`Instance '${err.hostname.split('.')[0]}' is not found.`));
        }
        throw err;
      });

      const options = {
        table_options: {
          time_to_live: -1,
          max_versions: 1
        }
      };
      const capacityUnit = { read: 0, write: 0 };

      const tbExist = tables.table_names.find(i => i === tableName);
      if (!tbExist) {
        await client.createTable(tableName, primaryKeys, capacityUnit, options);
      } else {
        debug('ots table already exists, but could not be updated');
      }
    } catch (ex) {
      console.log(red(`retry ${times} times`));
      retry(ex);
    }
  }, retryOptions);
}

module.exports = {
  makeApi, makeApiTrigger, makeFunction,
  makeGroup, makeOtsTable, makeOtsInstance, 
  makeOtsTrigger, makeService, makeTrigger, makeSlsProject, 
  makeLogstore, makeLogstoreIndex, makeCustomDomain
};