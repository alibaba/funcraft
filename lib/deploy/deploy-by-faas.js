'use strict';

const path = require('path');
const util = require('util');
const fs = require('fs');

const writeFile = util.promisify(fs.writeFile);

const { green } = require('colors');

const CloudAPI = require('@alicloud/cloudapi');
const FC = require('@alicloud/fc');
const Ram = require('@alicloud/ram');
const debug = require('debug')('fun:bin');

const zip = require('../zip');
const getConf = require('../conf');

const rootDir = process.cwd();

async function makeService(fc, serviceName, serviceDescription) {
  var service;
  try {
    service = await fc.getService(serviceName);
  } catch (ex) {
    if (ex.code !== 'ServiceNotFound') {
      throw ex;
    }
  }

  if (!service) {
    service = await fc.createService(serviceName, {
      description: serviceDescription
    });
  } else {
    service = await fc.updateService(serviceName, {
      description: serviceDescription
    });
  }

  return service;
}

async function makeFunction(fc, serviceName, func) {
  var fn;
  const functionName = func.name;
  const functionDescription = func.description;
  try {
    fn = await fc.getFunction(serviceName, functionName);
  } catch (ex) {
    if (ex.code !== 'FunctionNotFound') {
      throw ex;
    }
  }

  debug(`package function ${func.name}.`);
  const base64 = await zip.compress(func, rootDir);
  if (debug.enabled) {
    const zipPath = path.join(rootDir, `package_${serviceName}_${functionName}.zip`);
    await writeFile(zipPath, base64, 'base64');
  }
  debug(`package function ${func.name}. done.`);

  const params = {
    description: functionDescription,
    handler: func.handler,
    initializer: func.initializer || null,
    timeout: func.timeout || 3,
    initializationTimeout: func.initializationTimeout || 3,
    memorySize: func.memorySize || 128,
    runtime: func.runtime || 'nodejs6',
    code: {
      zipFile: base64
    }
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

async function makeTrigger(fc, serviceName, func, trigger) {
  const functionName = func.name;
  const triggerName = trigger.name;
  var _trigger;
  try {
    _trigger = await fc.getTrigger(serviceName, functionName, triggerName);
  } catch (ex) {
    if (ex.code !== 'TriggerNotFound') {
      throw ex;
    }
  }
  var options = {
    triggerType: trigger.type,
    triggerConfig: trigger.config
  };

  if (!_trigger) {
    // create
    options.triggerName = triggerName;
    _trigger = await fc.createTrigger(serviceName, functionName, options);
  } else {
    // update
    _trigger = await fc.updateTrigger(serviceName, functionName, triggerName, options);
  }
  return _trigger;
}

async function makeGroup(ag, group) {
  const groupName = group.name;
  const groupDescription = group.description;

  var groups = await ag.describeApiGroups({
    GroupName: groupName // filter out
  }, {timeout: 10000});

  var list = groups.ApiGroupAttributes.ApiGroupAttribute;
  var findGroup = list.find((item) => {
    return item.GroupName === groupName;
  });

  if (!findGroup) {
    findGroup = await ag.createApiGroup({
      GroupName: groupName,
      Description: groupDescription
    }, {timeout: 10000});
  }

  return findGroup;
}

async function makeRole(ram, conf) {
  const roleName = conf.name;
  var role;
  try {
    role = await ram.getRole({
      RoleName: roleName
    }, {timeout: 10000});
  } catch (ex) {
    if (ex.name !== 'EntityNotExist.RoleError') {
      throw ex;
    }
  }

  if (!role) {
    role = await ram.createRole({
      RoleName: roleName,
      Description: 'API网关访问 FunctionCompute',
      AssumeRolePolicyDocument: JSON.stringify({
        'Statement': [
          {
            'Action': 'sts:AssumeRole',
            'Effect': 'Allow',
            'Principal': {
              'Service': [
                'apigateway.aliyuncs.com'
              ]
            }
          }
        ],
        'Version': '1'
      })
    });
  }

  const policyName = 'AliyunFCInvocationAccess';
  const policies = await ram.listPoliciesForRole({
    RoleName: roleName
  });

  var policy = policies.Policies.Policy.find((item) => {
    return item.PolicyName === policyName;
  });

  if (!policy) {
    await ram.attachPolicyToRole({
      PolicyType: 'System',
      PolicyName: policyName,
      RoleName: roleName
    });
  }

  return role;
}

async function makeAPI(ag, group, conf, role) {
  const apiName = conf.name;
  const [fcRegion, serviceName, functionName] = conf['function'].split('/');
  const groupId = group.GroupId;
  const result = await ag.describeApis({
    ApiName: apiName,
    GroupId: groupId
  });
  var api = result.ApiSummarys && result.ApiSummarys.ApiSummary[0];

  const method = conf.method || 'GET';
  const parameters = conf.parameters || [];
  const requestParameters = parameters.map((item) => {
    return {
      ApiParameterName: item.name,
      Location: item.location || 'Query',
      ParameterType: item.type || 'String',
      Required: item.required
    };
  });
  const serviceParameters = parameters.map((item) => {
    return {
      ServiceParameterName: item.name,
      Location: item.location || 'Query',
      Type: item.type || 'String',
      ParameterCatalog: 'REQUEST'
    };
  });
  const serviceParametersMap = parameters.map((item) => {
    return {
      ServiceParameterName: item.name,
      RequestParameterName: item.name
    };
  });

  var params = {
    GroupId: groupId,
    ApiName: apiName,
    Visibility: conf.visibility || 'PUBLIC',
    Description: conf.description || 'The awesome api',
    AuthType: conf.auth_type || 'ANONYMOUS',
    RequestConfig: JSON.stringify({
      'RequestHttpMethod': method,
      'RequestProtocol': conf.requestProtocol || 'HTTP',
      'BodyFormat': conf.body_format || '',
      'PostBodyDescription': '',
      'RequestPath': conf.path
    }),
    RequestParameters: JSON.stringify(requestParameters),
    ServiceParameters: JSON.stringify(serviceParameters),
    ServiceParametersMap: JSON.stringify(serviceParametersMap),
    ServiceConfig: JSON.stringify({
      'ServiceProtocol': 'FunctionCompute',
      'ContentTypeValue': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Mock': 'FALSE',
      'MockResult': '',
      'ServiceTimeout': (conf.timeout || 3) * 1000,
      'ServiceAddress': '',
      'ServicePath': '',
      'ServiceHttpMethod': '',
      'ContentTypeCatagory':'DEFAULT',
      'ServiceVpcEnable': 'FALSE',
      FunctionComputeConfig: {
        FcRegionId: fcRegion,
        ServiceName: serviceName,
        FunctionName: functionName,
        RoleArn: role.Role.Arn
      }
    }),
    ResultType: conf.resultType || 'PASSTHROUGH',
    ResultSample: conf.resultSample || 'result sample'
  };

  if (params.AuthType === 'OPENID') {
    var openidConf = conf.openid_connect_config || {};
    params.OpenIdConnectConfig = JSON.stringify({
      'IdTokenParamName': openidConf.id_token_param_name || 'token',
      'OpenIdApiType': openidConf.openid_api_type || 'BUSINESS',
      'PublicKeyId': openidConf.public_key_id,
      'PublicKey': openidConf.public_key
    });
  }

  if (!api) {
    api = await ag.createApi(params);
  } else {
    await ag.modifyApi(Object.assign(params, {
      ApiId: api.ApiId
    }));
  }

  return api;
}

async function fun(stage) {
  const conf = await getConf(rootDir);

  if (!conf['function-compute']) {
    debug('No any function compute info, exited.');
    return;
  }

  console.log('Function compute(%s):',
    conf['function-compute'].region);
  const fc = new FC(conf.accountid, {
    accessKeyID: conf.accessKeyId,
    accessKeySecret: conf.accessKeySecret,
    region: conf['function-compute'].region,
    timeout: 60000
  });

  const services = conf['function-compute'].services;
  for (var i = 0; i < services.length; i++) {
    const item = services[i];
    const serviceDescription = item.description;
    const serviceName = item.name;
    await makeService(fc, serviceName, serviceDescription);
    console.log(`  service ${green(serviceName)} ok.`);
    const functions = item.functions;
    for (var j = 0; j < functions.length; j++) {
      const func = functions[j];
      // Step 1: make function
      debug('make sure Function Compute function');
      const fn = await makeFunction(fc, serviceName, func);
      debug(fn);
      console.log(`    function ${green(fn.functionName)} ok.`);
      if (func.triggers) {
        for (var k = 0; k < func.triggers.length; k++) {
          const trigger = func.triggers[k];
          const tgr = await makeTrigger(fc, serviceName, func, trigger);
          console.log(`      trigger ${green(tgr.triggerName)} ok.`);
        }
      }
    }
  }

  if (!conf['api-gateway']) {
    debug('no api gateway config, ignored');
    return;
  }

  // Step 3: make role
  debug('make sure Role');
  if (!conf.role) {
    conf.role = {
      name: 'apigatewayAccessFC'
    };
  }

  const ram = new Ram({
    accessKeyId: conf.accessKeyId,
    accessKeySecret: conf.accessKeySecret,
    endpoint: 'https://ram.aliyuncs.com'
  });

  const role = await makeRole(ram, conf.role);

  debug('%j', role);

  const stageName = stage || 'RELEASE';

  const ag = new CloudAPI({
    accessKeyId: conf.accessKeyId,
    accessKeySecret: conf.accessKeySecret,
    endpoint: conf['api-gateway'].endpoint
  });

  const matched = conf['api-gateway'].endpoint.match(/apigateway\.([^.]*)\.aliyuncs\.com/);
  const [ , region] = matched;
  // Step 4: make api group
  debug('make sure API Gateway & API Group');
  const groups = conf['api-gateway'].groups;
  console.log(`API gateway(${region}):`);
  for (var h = 0; h < groups.length; h++) {
    const group = groups[h];
    debug('%j', group);
    console.log(`  group ${green(group.name)} ok.`);
    const apiGroup = await makeGroup(ag, group);
    debug('%j', apiGroup);

    const apis = group.apis;
    for (var l = 0; l < apis.length; l++) {
      const _api = apis[l];
      const api = await makeAPI(ag, apiGroup, _api, role);
      debug('%j', api);

      await ag.deployApi({
        GroupId: apiGroup.GroupId,
        ApiId: api.ApiId,
        StageName: stageName,
        Description: `deployed by fun at ${new Date().toISOString()}`
      });

      const apiDetail = await ag.describeApi({
        GroupId: apiGroup.GroupId,
        ApiId: api.ApiId
      });

      console.log('    URL: %s http://%s%s',
        apiDetail.RequestConfig.RequestHttpMethod,
        apiGroup.SubDomain,
        apiDetail.RequestConfig.RequestPath);
      console.log(`      => ${_api.function}`);
      apiDetail.DeployedInfos.DeployedInfo.forEach((info) => {
        if (info.DeployedStatus === 'DEPLOYED') {
          console.log(green(`      stage: ${info.StageName}, deployed, version: ${info.EffectiveVersion}`));
        } else {
          console.log(`      stage: ${info.StageName}, undeployed`);
        }
      });
    }
  }
}

module.exports = fun;
