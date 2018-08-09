'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const yaml = require('js-yaml');
const getProfile = require('../profile').getProfile;

const getTpl = require('../tpl');
const validate = require('../validate/validate');
const debug = require('debug')('fun:deploy');

const { green } = require('colors');

const readFile = util.promisify(fs.readFile);

let {
  makeApi, makeApiTrigger, makeFunction,
  makeGroup, makeOtsTable, makeOtsInstance, 
  makeOtsTrigger, makeService, makeTrigger,
  makeSlsProject, makeLogstore, makeLogstoreIndex
} = require('./deploy-support');

let {
  makeRole, attachPolicyToRole, makeAndAttachPolicy
} = require('../ram');

function extractFcRole(role) {
  const [, , , , path] = role.split(':');
  const [, roleName] = path.split('/');
  return roleName;
}


async function deployFunction(serviceName, functionName, functionDefinition) {
  const properties = functionDefinition.Properties || {};

  await makeFunction({
    serviceName,
    functionName,
    description: properties.Description,
    handler: properties.Handler,
    timeout: properties.Timeout,
    memorySize: properties.MemorySize,
    runtime: properties.Runtime,
    codeUri: properties.CodeUri,
    environmentVariables: properties.EnvironmentVariables
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

async function deployFunctions(serviceName, serviceDefinition) {
  for (const [k, v] of Object.entries(serviceDefinition)) {
    if ((v || {}).Type === 'Aliyun::Serverless::Function') {
      console.log(`\tWaiting for function ${k} to be deployed...`);
      await deployFunction(serviceName, k, v);
      console.log(green(`\tfunction ${k} deploy success` ));
    }
  }
}

async function deployPolicy(serviceName, roleName, policy, curCount) {
  if (typeof policy === 'string') {
    await attachPolicyToRole(policy, roleName);
    return curCount;
  } 

  const profile = await getProfile();

  const policyName = nomalizeRoleOrPoliceName(`AliyunFcGeneratedServicePolicy-${profile.defaultRegion}-${serviceName}${curCount}`);
  
  await makeAndAttachPolicy(policyName, policy, roleName);
    
  return curCount + 1;
  
}

async function deployPolicies(serviceName, roleName, policies) {

  let nextCount = 1;

  if (Array.isArray(policies)) {
    for (let policy of policies) {
      nextCount = await deployPolicy(serviceName, roleName, policy, nextCount);
    }
  } else {
    nextCount = await deployPolicy(serviceName, roleName, policies, nextCount);
  }
}

function nomalizeRoleOrPoliceName(roleName) {
  return roleName.replace(/_/g, "-")
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

  const profile = await getProfile();

  if ( roleArn ) {
    roleName = extractFcRole(roleArn);
    createRoleIfNotExist = false;
  } else {
    roleName = `aliyunfcgeneratedrole-${profile.defaultRegion}-${serviceName}`;
    roleName = nomalizeRoleOrPoliceName(roleName)
    createRoleIfNotExist = true;
  }

  const role = await makeRole(roleName, createRoleIfNotExist);

  if ( ! roleArn && policies ) { // if roleArn exist, then ignore polices
    await deployPolicies(serviceName, roleName, policies);
  }

  if ( ! roleArn && vpcConfig) {
    await attachPolicyToRole('AliyunECSNetworkInterfaceManagementAccess', roleName);
  }

  if (logConfig.Logstore && logConfig.Project) {
    if (!roleArn) {
      const logPolicyName = nomalizeRoleOrPoliceName(`AliyunFcGeneratedLogPolicy-${profile.defaultRegion}-${serviceName}`);
      await makeAndAttachPolicy(logPolicyName, {
        'Version': '1',
        'Statement': [
          {
            'Action': [
              'log:PostLogStoreLogs'
            ],
            'Resource': `acs:log:*:*:project/${logConfig.Project}/logstore/${logConfig.Logstore}`,
            'Effect': 'Allow'
          }
        ]
      }, roleName);
      await attachPolicyToRole(logPolicyName, roleName, 'Custom');
    }
  } else if (logConfig.LogStore || logConfig.Project) {
    throw new Error('LogStore and Project must both exist');
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

async function deployLogstoreDefaultIndex(projectName, logstoreName) {
  await makeLogstoreIndex(projectName, logstoreName);
}

async function deployLogstore(projectName, logstoreDefinition) {
  for (const [logstoreName, v] of Object.entries(logstoreDefinition)) {
    if ((v || {}).Type === 'Aliyun::Serverless::Log::Logstore') {
      const properties = (v || {}).Properties;
      const ttl = properties.TTL;
      const shardCount = properties.ShardCount;

      console.log(`\tWaiting for log service logstore ${logstoreName} to be deployed...`);

      await makeLogstore({
        projectName,
        logstoreName,
        ttl,
        shardCount
      });

      await deployLogstoreDefaultIndex(projectName, logstoreName);

      console.log(green(`\tlog serivce logstore ${logstoreName} deploy success` ));
    }
  }
}



async function deployLogs(resourcesDefinition) {
  for (const [projectName, v] of Object.entries(resourcesDefinition)) {
    if ((v || {}).Type === 'Aliyun::Serverless::Log') {
      console.log(`Waiting for log service project ${projectName} to be deployed...`);
      const properties = (v || {}).Properties;

      const description = properties.Description || '';
      await makeSlsProject(projectName, description);
      
      await deployLogstore(projectName, v);
      console.log(green(`log serivce project ${projectName} deploy success\n` ));
    }
  }
}

async function deployTablestore(instanceName, resourceDefinition) {  
  const properties = (resourceDefinition || {}).Properties;
  if (properties) {
    const clusterType = (properties || {}).ClusterType;
    const description = (properties || {}).Description;
    await makeOtsInstance(instanceName, clusterType, description);
  } 

  for (const [k, v] of Object.entries(resourceDefinition)) {
    if ((v || {}).Type === 'Aliyun::Serverless::TableStore::Table') {
      console.log(`\tWaiting for table store ${k} to be created...`);
      await makeOtsTable({
        instanceName: instanceName,
        tableName: k,
        primaryKeys: (v.Properties || {}).PrimaryKeyList.map(i => ({
          'name': i.Name,
          'type': i.Type
        }))
      });
      console.log(green(`\tcreate table store ${k} successfully`));
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

          let roleName;
          if ( fcDefinition.role ) {
            roleName = extractFcRole(fcDefinition.role);
          } else {
            roleName = `AliyunFcGeneratedApiGatewayRole`;
          }
          
          const role = await makeRole(roleName, true, 'API Gateway access FunctionCompute', {
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
          });

          const policyName = 'AliyunFCInvocationAccess';
          await attachPolicyToRole(policyName, roleName);

          debug('%j', role);

          const apiName = methodDefinition['x-aliyun-apigateway-api-name'] || `${k.replace(/^\//, '').replace(/(\[|\])/g, '').replace(/\//g, '_')}_${method}`;

          const { serviceName, functionName } = extractFcArn(fcDefinition.arn);
          
          const serviceTimeout = fcDefinition.timeout || 3000;

          const resultConfig = {
            resultType: methodDefinition['x-aliyun-apigateway-result-type'],
            resultSample: methodDefinition['x-aliyun-apigateway-result-sample'],
            failResultSample: methodDefinition['x-aliyun-apigateway-fail-result-sample'],
          };

          const requestConfig = methodDefinition['x-aliyun-apigateway-request-config'] || {};

          let openIdConnectConfig = methodDefinition['x-aliyun-apigateway-open-id-connect-config'];
          if (!openIdConnectConfig) {
            openIdConnectConfig = methodDefinition['x-aliyun-apigateway-openid-connect-config'];
          }

          const constantParameters = methodDefinition['x-aliyun-apigateway-constant-parameters'];

          await makeApi(apiGroup, {
            stageName: apiDefinition.Properties.StageName,
            requestPath: k,
            method,
            roleArn: role.Role.Arn,
            apiName,
            serviceName,
            functionName,
            serviceTimeout,
            parameters: methodDefinition['x-aliyun-apigateway-request-parameters'],
            auth: {
              type: methodDefinition['x-aliyun-apigateway-auth-type'],
              config: openIdConnectConfig,
            },
            visibility: methodDefinition['x-aliyun-apigateway-visibility'],
            requestConfig,
            resultConfig,
            constantParameters, 
            description: methodDefinition['x-aliyun-apigateway-description']
          });
        }
      }
    }
  }

}

async function deploy(tplPath) {

  const { valid, ajv } = await validate(tplPath);

  if (!valid) {
    console.error(JSON.stringify(ajv.errors, null, 2));
    process.exit(-1);
  }

  const tpl = await getTpl(tplPath);

  await deployLogs(tpl.Resources);

  for (const [name, resource] of Object.entries(tpl.Resources)) {
    if (resource.Type === 'Aliyun::Serverless::Service') {
      console.log(`Waiting for service ${name} to be deployed...`);
      await deployFcService(name, resource);
      console.log(green(`service ${name} deploy success\n` ));
    } else if (resource.Type === 'Aliyun::Serverless::Api') {
      console.log(`Waiting for api gateway ${name} to be deployed...`);
      await deployApigateway(name, {
        apiDefinition: resource,
        template: tpl,
        tplPath
      });
      console.log(green(`api gateway ${name} deploy success\n` ));
    } else if (resource.Type === 'Aliyun::Serverless::TableStore') {
      console.log(`Waiting for table store ${name} to be deployed...`);
      await deployTablestore(name, resource);
      console.log(green(`table store ${name} deploy success\n` ));
    } else if (resource.Type === 'Aliyun::Serverless::Log') {
      // ignore, done by deployLogs
    } else {
      console.log('unknown resource %s', name);
    }
  }
}

module.exports = deploy;