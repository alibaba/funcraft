#!/usr/bin/env node

const fs = require('fs');
const util = require('util');
const path = require('path');

const yaml = require('js-yaml');
const CloudAPI = require('@alicloud/cloudapi');
const FC = require('@alicloud/fc');
const Ram = require('@alicloud/ram');
const debug = require('debug')('faas');

const JSZip = require('jszip');

const readFile = util.promisify(fs.readFile);
const exists = util.promisify(fs.exists);
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

  const zip = new JSZip();
  const code = func.code;
  for (var i = 0; i < code.length; i++) {
    var item = code[i];
    zip.file(item, await readFile(path.join(rootDir, item)));
  }
  const base64 = await zip.generateAsync({type:"base64"});

  if (!fn) {
    // create
    fn = await fc.createFunction(serviceName, {
      functionName: functionName,
      description: functionDescription,
      handler: func.handler,
      memorySize: 128,
      runtime: 'nodejs4.4',
      code: {
        zipFile: base64
      }
    });
  } else {
    // update
    fn = await fc.updateFunction(serviceName, functionName, {
      description: functionDescription,
      handler: func.handler,
      memorySize: 128,
      runtime: 'nodejs4.4',
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
  var group = list.find((item) => {
    return item.GroupName === groupName;
  });

  if (!group) {
    group = await ag.createApiGroup({
      GroupName: groupName,
      Description: groupDescription
    }, {timeout: 10000});
  }

  return group;
}

async function makeRole(ram, conf) {
  const roleName = conf.name;
  var role;
  try {
    role = await ram.getRole({
      RoleName: roleName
    });
  } catch (ex) {
    if (ex.name !== 'EntityNotExist.RoleError') {
      throw ex;
    }
  }

  if (!role) {
    role = await ram.createRole({
      RoleName: roleName,
      Description: "API网关访问 FunctionCompute",
      AssumeRolePolicyDocument: JSON.stringify({
        "Statement": [
          {
            "Action": "sts:AssumeRole",
            "Effect": "Allow",
            "Principal": {
              "Service": [
                "apigateway.aliyuncs.com"
              ]
            }
          }
        ],
        "Version": "1"
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
  const result = await ag.describeApis();
  var api = result.ApiSummarys && result.ApiSummarys.ApiSummary.find((item) => {
    return item.ApiName === apiName && item.GroupId === groupId;
  });

  if (!api) {
    const method = conf.method || 'GET';
    api = await ag.createApi({
      GroupId: groupId,
      ApiName: apiName,
      Visibility: 'PUBLIC',
      AuthType: 'ANONYMOUS',
      RequestConfig: JSON.stringify({
        "RequestHttpMethod": method,
        "RequestProtocol": "HTTP",
        "BodyFormat": conf.body_format || '',
        "PostBodyDescription": "",
        "RequestPath": conf.path
      }),
      ServiceConfig: JSON.stringify({
        "ServiceProtocol": "FunctionCompute",
        "ContentTypeValue": "application/x-www-form-urlencoded; charset=UTF-8",
        "Mock": "FALSE",
        "MockResult": "",
        "ServiceTimeout": 3000,
        "ServiceAddress": "",
        "ServicePath": "",
        "ServiceHttpMethod": "",
        "ContentTypeCatagory":"DEFAULT",
        "ServiceVpcEnable":"FALSE",
        FunctionComputeConfig: {
          FcRegionId: fcRegion,
          ServiceName: serviceName,
          FunctionName: functionName,
          RoleArn: role.Role.Arn
        }
      }),
      ResultType: "TEXT",
      ResultSample: "Hello world!"
    });
  }

  return api;
}


async function work() {
  const confPath = path.join(rootDir, 'faas.yml');
  const isexists = await exists(confPath);
  if (!isexists) {
    console.log('Current folder not a Faas project');
    process.exit(-1);
  }
  const confContent = await readFile(confPath, 'utf8');
  const conf = yaml.safeLoad(confContent);
  debug('exitst config: %j', conf);

  const ag = new CloudAPI({
    accessKeyId: conf.accessKeyId,
    accessKeySecret: conf.accessKeySecret,
    endpoint: conf['api-gateway'].endpoint
  });

  const ram = new Ram({
    accessKeyId: conf.accessKeyId,
    accessKeySecret: conf.accessKeySecret,
    endpoint: 'https://ram.aliyuncs.com'
  });

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
    const service = await makeService(fc, serviceName, serviceDescription);
    const functions = item.functions;
    for (var j = 0; j < functions.length; j++) {
      const func = functions[j];
      // Step 1: make function
      debug('make sure Function Compute function');
      const fn = await makeFunction(fc, serviceName, func);
      debug(fn);
    }
  }

  // Step 3: make role
  debug('make sure Role');
  const role = await makeRole(ram, conf.role);

  debug('%j', role);

  // Step 4: make api group
  debug('make sure API Gateway & API Group');
  const groups = conf['api-gateway'].groups;
  for (var k = 0; k < groups.length; k++) {
    const group = groups[k];
    debug('%j', group);
    const apiGroup = await makeGroup(ag, group);
    debug('%j', apiGroup);

    const apis = group.apis;
    for (var l = 0; l < apis.length; l++) {
      const _api = apis[l];
      const api = await makeAPI(ag, apiGroup, _api, role);
      debug('%j', api);

      const deploy = await ag.deployApi({
        GroupId: apiGroup.GroupId,
        ApiId: api.ApiId,
        StageName: 'RELEASE',
        Description: 'Just for test'
      });

      const apiDetail = await ag.describeApi({
        GroupId: apiGroup.GroupId,
        ApiId: api.ApiId
      });

      console.log('URL: %s http://%s%s => %s',
        apiDetail.RequestConfig.RequestHttpMethod,
        apiGroup.SubDomain,
        apiDetail.RequestConfig.RequestPath,
        _api.function);
    }
  }
}

work().then(() => {

}, (err) => {
  console.error(err.stack);
});
