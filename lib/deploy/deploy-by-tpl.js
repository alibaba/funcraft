'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const yaml = require('js-yaml');

const getTpl = require('../tpl');
const validate = require('../validate/validate');
const debug = require('debug')('fun:deploy');

const readFile = util.promisify(fs.readFile);

let {
  makeApi, makeApiTrigger, makeFunction,
  makeGroup, makeOtsTable, makeOtsInstance, makeOtsTrigger,
  makeRole, makeInvocationRole, attachPolicyToRole, makeService, makeTrigger, makeSlsProject, makeLogstore, makePolicy
} = require('./deploy-support');

async function deployFunction(serviceName, functionName, functionDefinition) {

  await makeFunction({
    serviceName,
    functionName,
    description: (functionDefinition.Properties || {}).Description,
    handler: (functionDefinition.Properties || {}).Handler,
    timeout: (functionDefinition.Properties || {}).Timeout,
    memorySize: (functionDefinition.Properties || {}).MemorySize,
    runtime: (functionDefinition.Properties || {}).Runtime,
    codeUri: (functionDefinition.Properties || {}).CodeUri
  });

  if (functionDefinition.Events) {
    for (const [triggerName, triggerDefinition] of Object.entries(functionDefinition.Events)) {
      if (triggerDefinition.Type === 'Api') {
        await makeApiTrigger({
          serviceName,
          functionName,
          triggerName,
          method: ((triggerDefinition.Properties || {}).Method || 'GET').toUpperCase(),
          requestPath: (triggerDefinition.Properties || {}).Path,
          restApiId: (triggerDefinition.Properties || {}).RestApiId
        });
      } else if (triggerDefinition.Type === 'OTS') {
        await makeOtsTrigger({
          serviceName,
          functionName,
          triggerName,
          stream: (triggerDefinition.Properties || {}).Stream
        });
      } else if (triggerDefinition.Type === 'Datahub') {
        console.error(`Try to create Datahub Trigger, but the SDK didn't OK.`);
      } else {
        await makeTrigger({
          serviceName,
          functionName,
          triggerName,
          triggerType: triggerDefinition.Type,
          triggerProperties: triggerDefinition.Properties
        });
      }
    }
  }
}


async function deployFcService(serviceName, serviceDefinition) {
  const properties = (serviceDefinition.Properties || {});
  const roleArn = properties.Role;
  const internetAccess = 'InternetAccess' in properties ? properties.InternetAccess : null;
  const policies = properties.Policies;
  const vpcConfig = properties.VpcConfig;
  const logConfig = properties.LogConfig || {};
  let roleName;
  let createRoleIfNotExist;

  if ( roleArn ) {
    roleName = extractFcRole(roleArn);
    createRoleIfNotExist = false;
  } else {
    roleName = `AliyunFcDefaultRole-${serviceName}`;
    createRoleIfNotExist = true;
  }

  const role = await makeRole(roleName, createRoleIfNotExist);

  if ( ! roleArn && policies ) { // if roleArn exist, then ignore polices
    await deployPolicies(serviceName, roleName, policies);
  }

  if ( ! roleArn && vpcConfig) {
    await attachPolicyToRole("AliyunECSNetworkInterfaceManagementAccess", roleName)
  }

  if (logConfig.Logstore && logConfig.Project) {
    if (!roleArn) {
      const logPolicyName = `AliyunFcGeneratedLogPolicy-${serviceName}`
      await makeAndAttachPolicy(logPolicyName, {
        "Version": "1",
        "Statement": [
          {
            "Action": [
              "log:PostLogStoreLogs"
            ],
            "Resource": `acs:log:*:*:project/${logConfig.Project}/${logConfig.Logstore}/*`,
            "Effect": "Allow"
          }
        ]
      }, roleName);
      await attachPolicyToRole(logPolicyName, roleName, 'Custom');
    }
  } else if (logConfig.LogStore || logConfig.Project) {
    throw new Error("LogStore and Project must both exist");
  } 

  await makeService({
    serviceName,
    role: role.Role.Arn,
    internetAccess,
    description: (serviceDefinition.Properties || {}).Description,
    logConfig,
    vpcConfig
  });
  
  await deployFunctions(serviceName, serviceDefinition);
}

async function deployPolicies(serviceName, roleName, policies) {

  async function deployPolicy(serviceName, roleName, policy) {
    if (typeof policy === 'string') {
      await attachPolicyToRole(policy, roleName);
    } else {
      count++;
      const policyName = `AliyunFcGeneratedPolicy-${serviceName}${count}`
    
      await makeAndAttachPolicy(policyName, policy, roleName);
    }
  }

  let count = 0;

  if (Array.isArray(policies)) {
    for (let policy of policies) {
      await deployPolicy(serviceName, roleName, policy);
    }
  } else {
    await deployPolicy(serviceName, roleName, policies);
  }
}


async function makeAndAttachPolicy(policyName, policyDocument, roleName) {
  await makePolicy(policyName, policyDocument);
  await attachPolicyToRole(policyName, roleName, 'Custom');
}

async function deployLogstore(projectName, logstoreDefinition) {
  for (const [logstoreName, v] of Object.entries(logstoreDefinition)) {
    if ((v || {}).Type === 'Aliyun::Serverless::Log::Logstore') {
      const properties = (v || {}).Properties;
      const ttl = properties.TTL;
      const shardCount = properties.ShardCount;

      await makeLogstore({
        projectName,
        logstoreName,
        ttl,
        shardCount
      });
    }
  }
}

async function deployLogs(resourcesDefinition) {
  for (const [projectName, v] of Object.entries(resourcesDefinition)) {
    if ((v || {}).Type === 'Aliyun::Serverless::Log') {
      const properties = (v || {}).Properties;

      const description = properties.Description || '';
      await makeSlsProject(projectName, description);
      
      await deployLogstore(projectName, v);
    }
  }
}

async function deployFunctions(serviceName, serviceDefinition) {
  for (const [k, v] of Object.entries(serviceDefinition)) {
    if ((v || {}).Type === 'Aliyun::Serverless::Function') {
      await deployFunction(serviceName, k, v);
    }
  }
}

async function deployTablestore(instanceName, resourceDefinition) {  
  const properties = (resourceDefinition || {}).Properties;
  if (properties) {
    const clusterType = (properties || {}).ClusterType;
    const description = (properties || {}).Description;

    if (!clusterType) {
      console.log("Tablestore ClusterType must be supplied");
      process.exit(-1);
    }

    if (!description) {
      console.log("Tablestore description must be supplied");
      process.exit(-1);
    }

    await makeOtsInstance(instanceName, clusterType, description);
  } 

  for (const [k, v] of Object.entries(resourceDefinition)) {
    if ((v || {}).Type === 'Aliyun::Serverless::TableStore::Table') {
      await makeOtsTable({
        instanceName: instanceName,
        tableName: k,
        primaryKeys: (v.Properties || {}).PrimaryKeyList.map(i => ({
          'name': i.Name,
          'type': i.Type
        }))
      });
    }
  }
}

function evaluteExp(exp, ctx) {
  const match = /^\$\{(.+)\}$/.exec(exp);
  if (match) {
    if (match[1].endsWith('.Arn')) {
      return match[1].substring(0, match[1].length - '.Arn'.length);
    }
    return ctx[match[1]];

  }
  return exp;

}

function extractFcArn(arn) {
  const [, , , , path] = arn.split(':');
  const [, serviceName, , functionName] = path.split('/');
  return {
    serviceName: evaluteExp(serviceName),
    functionName: evaluteExp(functionName)
  };
}

function extractFcRole(role) {
  const [, , , , path] = role.split(':');
  const [, roleName] = path.split('/');
  return roleName;
}

async function getSwagger(apiDefinition, tplPath) {
  const props = apiDefinition.Properties;
  if (props) {
    if (props.DefinitionBody) {
      return props.DefinitionBody;
    } else if (props.DefinitionUri) {
      var swaggerPath;
      if (path.isAbsolute(props.DefinitionUri)) {
        swaggerPath = props.DefinitionUri;
      } else {
        swaggerPath = path.join(path.dirname(tplPath), props.DefinitionUri);
      }
      const swaggerContent = await readFile(swaggerPath, 'utf8');
      return yaml.safeLoad(swaggerContent);
    }
  } else {
    return null;
  }
}


async function deployApigateway(name, { apiDefinition, template, tplPath }) {
  const swaggerContent = await getSwagger(apiDefinition, tplPath);

  if (swaggerContent) {
    for (const [k, v] of Object.entries(swaggerContent)) {
      if (!['openapi', 'info', 'components'].includes(k)) {

        const apiGroup = await makeGroup({
          name,
          description: `api group for function compute`
        });
        for (const [method, methodDefinition] of Object.entries(v)) {
          const fcDefinition = methodDefinition['x-aliyun-apigateway-fc'];
          const role = await makeInvocationRole(extractFcRole(fcDefinition.role, 'API网关访问 FunctionCompute'));
          debug('%j', role);

          const apiName = methodDefinition['x-aliyun-apigateway-api-name'] || `${k.replace(/^\//, '').replace(/(\[|\])/g, '').replace(/\//g, '_')}_${method}`;

          const { serviceName, functionName } = extractFcArn(fcDefinition.arn);
          
          const timeout = fcDefinition.timeout || 3000;

          const resultConfig = methodDefinition['x-aliyun-apigateway-result'] || {};
        
          const requestConfig = methodDefinition['x-aliyun-apigateway-request-config'] || {};

          await makeApi(apiGroup, {
            stageName: apiDefinition.Properties.StageName,
            requestPath: k,
            method,
            role,
            apiName,
            serviceName,
            functionName,
            timeout,
            parameters: methodDefinition['x-aliyun-apigateway-request-parameters'],
            auth: {
              type: methodDefinition['x-aliyun-apigateway-auth-type'],
              config: methodDefinition['x-aliyun-apigateway-auth-config'],
            },
            visibility: methodDefinition['x-aliyun-apigateway-visibility'],
            requestConfig: requestConfig,
            resultConfig: resultConfig
          });
        }
      }
    }
  }

}

async function deploy(tplPath) {

  // todo: fix validate
  // const { valid, ajv } = await validate(tplPath);

  // if (!valid) {
  //   console.error(JSON.stringify(ajv.errorsText(), null, 2));
  //   process.exit(-1);
  // }

  const tpl = await getTpl(tplPath);

  await deployLogs(tpl.Resources);

  for (const [name, resource] of Object.entries(tpl.Resources)) {
    if (resource.Type === 'Aliyun::Serverless::Service') {
      await deployFcService(name, resource);
    } else if (resource.Type === 'Aliyun::Serverless::Api') {
      await deployApigateway(name, {
        apiDefinition: resource,
        template: tpl,
        tplPath
      });
    } else if (resource.Type === 'Aliyun::Serverless::TableStore') {
      await deployTablestore(name, resource);
    } else if (resource.Type === 'Aliyun::Serverless::Log') {
      // ignore, done by deployLogs
    } else {
      console.log('unknown resource %s', name);
    }
  }
}

module.exports = deploy;