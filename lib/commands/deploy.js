'use strict';

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

  const base64 = await zip.compress(func, rootDir, 'remote');

  if (!fn) {
    // create
    fn = await fc.createFunction(serviceName, {
      functionName: functionName,
      description: functionDescription,
      handler: func.handler,
      timeout: func.timeout || 3,
      memorySize: func.memorySize || 128,
      runtime: func.runtime || 'nodejs4.4',
      code: {
        zipFile: base64
      }
    });
  } else {
    // update
    fn = await fc.updateFunction(serviceName, functionName, {
      description: functionDescription,
      handler: func.handler,
      timeout: func.timeout || 3,
      memorySize: func.memorySize || 128,
      runtime: func.runtime || 'nodejs4.4',
      code: {
        zipFile: base64
      }
    });
  }
  return fn;
}

async function makeGroup(ag, group) {
  const groupName = group.name;
  const groupDescription = group.description;

  var groups = await ag.describeApiGroups({}, {timeout: 10000});

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
    ApiName: apiName
  });
  var api = result.ApiSummarys && result.ApiSummarys.ApiSummary.find((item) => {
    return item.ApiName === apiName && item.GroupId === groupId;
  });

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

  if (!api) {
    api = await ag.createApi({
      GroupId: groupId,
      ApiName: apiName,
      Visibility: 'PUBLIC',
      AuthType: 'ANONYMOUS',
      RequestConfig: JSON.stringify({
        'RequestHttpMethod': method,
        'RequestProtocol': 'HTTP',
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
        'ServiceTimeout': conf.timeout || 3000,
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
      ResultType: conf.resultType || 'TEXT',
      ResultSample: conf.resultSample || 'result sample'
    });
  } else {
    await ag.modifyApi({
      GroupId: groupId,
      ApiId: api.ApiId,
      ApiName: apiName,
      Visibility: 'PUBLIC',
      Description: conf.description || 'The awesome api',
      AuthType: 'ANONYMOUS',
      RequestConfig: JSON.stringify({
        'RequestHttpMethod': method,
        'RequestProtocol': 'HTTP',
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
      ResultType: conf.resultType || 'TEXT',
      ResultSample: conf.resultSample || 'result sample'
    });
  }

  return api;
}

async function fun(stage) {
  const conf = await getConf(rootDir);

  if (!conf['function-compute']) {
    return;
  }

  console.log('Function compute(%s):',
    conf['function-compute'].region);
  const fc = new FC(conf.accountid, {
    accessKeyID: conf.accessKeyId,
    accessKeySecret: conf.accessKeySecret,
    region: conf['function-compute'].region
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
    }
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

  if (!conf['api-gateway']) {
    debug('no api gateway config, ignored');
    return;
  }

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
  for (var k = 0; k < groups.length; k++) {
    const group = groups[k];
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
