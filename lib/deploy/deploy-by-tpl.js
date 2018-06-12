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
  makeGroup, makeOtsTable, makeOtsTrigger,
  makeRole, makeInvocationRole, attachPolicyToRole, makeService, makeTrigger
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

  let roleArn = (serviceDefinition.Properties || {}).Role;
  let policies = (serviceDefinition.Properties || {}).Policies;
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

  if ( ! roleArn && policies ) {
    if (Array.isArray(policies)) {
        for (var policy of policies) {
          await attachPolicyToRole(policy, roleName);
        }
    } else {
      await attachPolicyToRole(policies, roleName);
    }
  } 

  await makeService(
    serviceName,
    role.Role.Arn,
    (serviceDefinition.Properties || {}).Description
  );

  for (const [k, v] of Object.entries(serviceDefinition)) {
    if ((v || {}).Type === 'Aliyun::Serverless::Function') {
      await deployFunction(serviceName, k, v);
    }
  }

}



async function deployTablestore(name, resourceDefinition) {

  for (const [k, v] of Object.entries(resourceDefinition)) {
    if ((v || {}).Type === 'Aliyun::Serverless::TableStore::Table') {
      await makeOtsTable({
        instanceName: name,
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


function bodyFormat(requestBody) {
  if (requestBody) {
    if (requestBody.content) {
      if (requestBody.content['application/octet-stream']) {
        if (requestBody.content['application/octet-stream'].schema) {
          if (requestBody.content['application/octet-stream'].schema.type === 'string'
            && requestBody.content['application/octet-stream'].schema.format === 'binary'
          ) {
            return 'STREAM';
          }
        }
      }
    }
  }

  return '';
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
          const role = await makeInvocationRole(extractFcRole(methodDefinition['x-aliyun-apigateway-fc'].role, 'API网关访问 FunctionCompute'));
          debug('%j', role);

          const apiName = methodDefinition['x-aliyun-apigateway-api-name'] || `${k.replace(/^\//, '').replace(/(\[|\])/g, '').replace(/\//g, '_')}_${method}`;

          const { serviceName, functionName } = extractFcArn(methodDefinition['x-aliyun-apigateway-fc'].arn);

          await makeApi(apiGroup, {
            stageName: apiDefinition.Properties.StageName,
            requestPath: k,
            method,
            role,
            apiName,
            serviceName,
            functionName,
            bodyFormat: bodyFormat(methodDefinition.requestBody),
            parameters: methodDefinition['x-aliyun-apigateway-parameters'],
            auth: {
              type: methodDefinition['x-aliyun-apigateway-auth-type'],
              config: methodDefinition['x-aliyun-apigateway-auth-config'],
            },
            visibility: methodDefinition['x-aliyun-apigateway-visibility']
          });
        }
      }
    }
  }

}

async function deploy(tplPath) {

  const { valid, ajv } = await validate(tplPath);

  if (!valid) {
    console.error(JSON.stringify(ajv.errorsText(), null, 2));
    process.exit(-1);
  }

  const tpl = await getTpl(tplPath);

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
    } else {
      console.log('unknown resource %s', name);
    }
  }

}

module.exports = deploy;