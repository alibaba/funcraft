'use strict';

const fs = require('fs');
const util = require('util');

const ALY = require('aliyun-sdk');

const FC = require('@alicloud/fc');
const ots = require('@alicloud/ots2');
const Pop = require('@alicloud/pop-core');
const CloudAPI = require('@alicloud/cloudapi');

const getProfile = require('../profile').getProfile;
const zip = require('../zip');
const debug = require('debug')('fun:deploy');

let {
  makeRole, attachPolicyToRole, makePolicy
} = require('../ram');

const readFile = util.promisify(fs.readFile);

const { green } = require('colors');

function slsRequesttoPromise(action) {
  return new Promise(function(resolve, reject) {
    action(function (err, data) {
      if (!err) {
        resolve(data);
      } else {
        reject(err);
      }
    });
  });
}

const getFcClient = async () => {
  const profile = await getProfile();

  return new FC(profile.accountId, {
    accessKeyID: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    region: profile.defaultRegion,
    timeout: 60000
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
    timeout: 3000 // default 3000ms
  });
};

const getPopClient = async() => {
  const profile = await getProfile();
  
  return new Pop({
    endpoint: `http://ots.${profile.defaultRegion}.aliyuncs.com`,
    apiVersion: '2016-06-20',
    accessKeyId: profile.accessKeyId,
    secretAccessKey: profile.accessKeySecret
  });
};

const getCloudApiClient = async () => {
  const profile = await getProfile();

  return new CloudAPI({
    accessKeyId: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    endpoint: `http://apigateway.${profile.defaultRegion}.aliyuncs.com`
  });
};


const getSlsClient = async () => {
  const profile = await getProfile();

  return new ALY.SLS({
    'accessKeyId': profile.accessKeyId,
    'secretAccessKey': profile.accessKeySecret,
    'endpoint': `http://${profile.defaultRegion}.log.aliyuncs.com`,
    apiVersion: '2015-06-01',
    httpOptions: {
      timeout: 10000 // 10s
    }
  });  
};

async function makeLogstore({
  projectName,
  logstoreName,
  ttl,
  shardCount
}) {
  const sls = await getSlsClient();

  let exists = true;

  try {
    await slsRequesttoPromise((callback) => {
      sls.getLogstore({
        projectName,
        LogStoreName: logstoreName
      }, callback);
    });
  } catch (ex) {
    if (ex.errorCode !== 'LogStoreNotExist') {
      throw ex;
    } else {exists = false;}
  }

  if (!exists) {
    await slsRequesttoPromise((callback) => {
      sls.createLogstore({
        projectName,
        logstoreDetail: {
          logstoreName,
          ttl,
          shardCount
        }
      }, callback);
    });
  } else {
    try {
      await slsRequesttoPromise((callback) => {
        sls.updateLogstore({
          projectName,
          logstoreName,
          logstoreDetail: {
            logstoreName,
            ttl,
            shardCount
          }
        }, callback);
      });
    } catch (ex) {
      if (ex.errorCode !== 'ParameterInvalid' && ex.errorMessage !== 'no parameter changed') {
        throw ex;
      }
    }
  }
  

}

async function makeSlsProject(projectName, description) {
  const sls = await getSlsClient();

  let projectExist = true;

  try {
    await slsRequesttoPromise((callback) => {
      sls.getProject({projectName}, callback);
    });
  } catch(ex) {
    if (ex.errorCode !== 'ProjectNotExist') {
      throw ex;
    } else {projectExist = false;}   
  }

  if (projectExist) {
    // no update project api
    // only description can be updated by console.
    debug(`sls project exists, but could not be updated`);
  } else {
    try {
      await slsRequesttoPromise((callback) => {
        sls.createProject({projectDetail: {
          projectName,
          description
        }}, callback);
      });
    } catch (ex) {
      if (ex.errorCode === 'ProjectAlreadyExist') {
        console.error(`error: sls project ${projectName} already exist, it may be in other region or created by other users.`);
        process.exit(-1);
      } else {
        throw ex;
      }
    }    
  }
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
  try {
    service = await fc.getService(serviceName);
  } catch (ex) {
    if (ex.code !== 'ServiceNotFound') {
      throw ex;
    }
  }

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

  if (!service) {
    service = await fc.createService(serviceName, options);
  } else {
    service = await fc.updateService(serviceName, options);
  }

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
  timeout = 3,
  memorySize = 128,
  runtime = 'nodejs6',
  codeUri
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
    debug(`package function ${functionName}.`);
    const base64 = await getFunCodeAsBase64(codeUri);
    debug(`package function ${functionName}. done.`);

    code = {
      zipFile: base64
    };
  }

  const params = {
    description,
    handler,
    timeout,
    memorySize,
    runtime,
    code
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
      enable: triggerProperties.Properties.Enable
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
        functionParameter: logConfig.FunctionParameter || {},
        enable: logConfig.Enable
      }
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

async function makeGroup(group) {
  const ag = await getCloudApiClient();

  const groupName = group.name;
  const groupDescription = group.description;

  var groups = await ag.describeApiGroups({
    GroupName: groupName
  }, { timeout: 10000 });

  var list = groups.ApiGroupAttributes.ApiGroupAttribute;
  var findGroup = list.find((item) => {
    return item.GroupName === groupName;
  });

  if (!findGroup) {
    findGroup = await ag.createApiGroup({
      GroupName: groupName,
      Description: groupDescription
    }, { timeout: 10000 });
  }

  return findGroup;
}

function getDefaultRequestConfig(method, requestPath) {
  return {
    'requestProtocol': 'HTTP',
    'postBodyDescription': '',
    'requestMode': 'MAPPING'
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
  role,
  apiName,
  serviceName,
  functionName,
  timeout = 3000,
  bodyFormat,
  parameters = [],
  auth = {},
  visibility,
  requestConfig = {},
  resultConfig = {}
}) {
  const ag = await getCloudApiClient();

  const result = await ag.describeApis({
    ApiName: apiName,
    GroupId: group.GroupId
  });

  var api = result.ApiSummarys && result.ApiSummarys.ApiSummary[0];

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
    Visibility: 'PUBLIC',
    Description: 'The awesome api',
    ServiceTimeout: timeout,
    AuthType: 'ANONYMOUS',
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
      'ServiceTimeout': timeout,
      FunctionComputeConfig: {
        FcRegionId: profile.defaultRegion,
        ServiceName: serviceName,
        FunctionName: functionName,
        RoleArn: role.Role.Arn
      }
    }),
    ResultType: resultConfig.type || 'passthrough', 
    ResultSample: resultConfig.sample || 'result sample',
    FailResultSample: resultConfig.failSample || 'failed samples'
  };

  if (auth.type === 'OPENID') {
    var openidConf = auth.config || {};
    params.OpenIdConnectConfig = JSON.stringify({
      'IdTokenParamName': openidConf['id-token-param-name'] || 'token',
      'OpenIdApiType': openidConf['openid-api-type'] || 'BUSINESS',
      'PublicKeyId': openidConf['public-key-id'],
      'PublicKey': openidConf['public-key']
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

  console.log('    URL: %s http://%s%s',
    apiDetail.RequestConfig.RequestHttpMethod,
    group.SubDomain,
    apiDetail.RequestConfig.RequestPath);
  console.log(`      => ${api.function}`);
  apiDetail.DeployedInfos.DeployedInfo.forEach((info) => {
    if (info.DeployedStatus === 'DEPLOYED') {
      console.log(green(`      stage: ${info.StageName}, deployed, version: ${info.EffectiveVersion}`));
    } else {
      console.log(`      stage: ${info.StageName}, undeployed`);
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
      role,
      apiName,
      serviceName,
      functionName
    });
  }
}

async function makeOtsInstance(instanceName, clusterType, description) {
  const pop = await getPopClient();

  try {
    await pop.request('GetInstance', {
      'InstanceName': instanceName
    });

    return ;
  } catch (ex) {
    if (ex.code !== 'NotFound') {
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

  const client = await getOtsClient(instanceName);

  const tables = await client.listTable().catch(err => {
    if (err.errno === 'ENOTFOUND' && err.syscall === 'getaddrinfo') {
      console.error(`Instance '${err.hostname.split('.')[0]}' is not found.`);
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
    console.log(`${tableName} not exist.`);
    await client.createTable(tableName, primaryKeys, capacityUnit, options);
  } else {
    debug('ots table already exists, but could not be updated');
  }
}

module.exports = {
  makeApi, makeApiTrigger, makeFunction,
  makeGroup, makeOtsTable, makeOtsInstance, makeOtsTrigger,
  makeService, makeTrigger, makeSlsProject, makeLogstore
};