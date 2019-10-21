'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const yaml = require('js-yaml');
const { getProfile, mark } = require('../profile');

const getTpl = require('../tpl').getTpl;
const validate = require('../validate/validate');
const debug = require('debug')('fun:deploy');
const { deployByRos } = require('./deploy-support-ros');
const { displayTriggerInfo } = require('../../lib/trigger');
const { green, yellow, red } = require('colors');

const readFile = util.promisify(fs.readFile);
const _ = require('lodash');

const { makeService, makeFunction } = require('../fc');

const { getTriggerNameList, makeTrigger } = require('../trigger');

const definition = require('../definition');

let {
  makeApi,
  makeApiTrigger,
  makeGroup,
  makeOtsTable,
  makeOtsInstance,
  makeMnsTopic,
  makeSlsProject,
  makeLogstore,
  makeLogstoreIndex,
  makeCustomDomain
} = require('./deploy-support');

let {
  makeRole,
  attachPolicyToRole,
  makeAndAttachPolicy,
  normalizeRoleOrPoliceName
} = require('../ram');

function extractFcRole(role) {
  const [, , , , path] = role.split(':');
  const [, roleName] = path.split('/');
  return roleName;
}

async function deployTrigger(serviceName, functionName, triggerName, triggerDefinition) {
  if (triggerDefinition.Type === 'Api') {
    await makeApiTrigger({
      serviceName,
      functionName,
      triggerName,
      method: ((triggerDefinition.Properties || {}).Method || 'GET').toUpperCase(),
      requestPath: (triggerDefinition.Properties || {}).Path,
      restApiId: (triggerDefinition.Properties || {}).RestApiId
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

async function deployTriggers(serviceName, functionName, events) {

  events = events || {};

  let localTriggerNames = Object.keys(events);
  let onLineTriggerNames = await getTriggerNameList({serviceName, functionName});

  onLineTriggerNames.filter(x =>!_.includes(localTriggerNames, x)).forEach(element => {

    console.warn(red(`\t\tThe trigger ${element} you configured in fc console does not match the local configuration.\n\t\tFun will not modify this trigger. You can remove this trigger manually through fc console if necessary`));

  });

  for (const [triggerName, triggerDefinition] of Object.entries(events)) {
    console.log(`\t\tWaiting for ${yellow(triggerDefinition.Type)} trigger ${triggerName} to be deployed...`);

    await deployTrigger(serviceName, functionName, triggerName, triggerDefinition);

    if (triggerDefinition.Type === 'HTTP') {

      await displayTriggerInfo(serviceName, functionName, triggerName, triggerDefinition.Properties, '\t\t');
    }
    console.log(green(`\t\tfunction ${triggerName} deploy success`));
  }
}

async function deployFunction(baseDir, serviceName, functionName, functionRes, nasConfig, onlyConfig) {
  const properties = functionRes.Properties || {};

  await makeFunction(baseDir, {
    serviceName,
    functionName,
    description: properties.Description,
    handler: properties.Handler,
    initializer: properties.Initializer,
    timeout: properties.Timeout,
    initializationTimeout: properties.InitializationTimeout,
    memorySize: properties.MemorySize,
    runtime: properties.Runtime,
    codeUri: properties.CodeUri,
    environmentVariables: properties.EnvironmentVariables,
    nasConfig
  }, onlyConfig);
  await deployTriggers(serviceName, functionName, functionRes.Events);
}

async function deployFunctions(baseDir, serviceName, serviceRes, onlyConfig) {
  const serviceProps = serviceRes.Properties || {};
  for (const [k, v] of Object.entries(serviceRes)) {
    if ((v || {}).Type === 'Aliyun::Serverless::Function') {

      const beforeDeployLog = onlyConfig ? 'config to be updated' : 'to be deployed';
      const afterDeployLog = onlyConfig ? 'config update success' : 'deploy success';

      console.log(`\tWaiting for function ${k} ${beforeDeployLog}...`);
      await deployFunction(baseDir, serviceName, k, v, serviceProps.NasConfig, onlyConfig);
      console.log(green(`\tfunction ${k} ${afterDeployLog}`));
    }
  }
}

async function deployPolicy(serviceName, roleName, policy, curCount) {
  if (typeof policy === 'string') {
    await attachPolicyToRole(policy, roleName);
    return curCount;
  }

  const profile = await getProfile();

  const policyName = normalizeRoleOrPoliceName(`AliyunFcGeneratedServicePolicy-${profile.defaultRegion}-${serviceName}${curCount}`);

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

async function deployService(baseDir, serviceName, serviceRes, onlyConfig) {
  const properties = (serviceRes.Properties || {});
  const roleArn = properties.Role;
  const internetAccess = 'InternetAccess' in properties ? properties.InternetAccess : null;
  
  const policies = properties.Policies;
  
  const vpcConfig = properties.VpcConfig;
  const nasConfig = properties.NasConfig;

  const logConfig = properties.LogConfig || {};

  let roleName;
  let createRoleIfNotExist;
  let role;
  const profile = await getProfile();

  if (roleArn === undefined || roleArn === null) {
    roleName = `aliyunfcgeneratedrole-${profile.defaultRegion}-${serviceName}`;
    roleName = normalizeRoleOrPoliceName(roleName);
    createRoleIfNotExist = true;
  } else {
    try {
      roleName = extractFcRole(roleArn);
    } catch (ex) {
      throw new Error('The role you provided is not correct. You must provide the correct role arn.');
    }
    createRoleIfNotExist = false;
  }

  // if roleArn has been configured, dont need `makeRole`, because `makeRole` need ram permissions. 
  // However, in some cases, users do not want to configure ram permissions for ram users.
  // https://github.com/aliyun/fun/issues/182
  // https://github.com/aliyun/fun/pull/223
  if (!roleArn && (policies || !_.isEmpty(vpcConfig) || !_.isEmpty(logConfig) || !_.isEmpty(nasConfig))) {
    // create role

    console.log(`\tmake sure role '${roleName}' is exist`);

    role = await makeRole(roleName, createRoleIfNotExist);

    console.log(green(`\trole '${roleName}' is already exist`));
  }

  if (!roleArn && policies) { // if roleArn exist, then ignore polices
    console.log('\tattaching policies ' + policies + ' to role: ' + roleName);
    await deployPolicies(serviceName, roleName, policies);
    console.log(green('\tattached policies ' + policies + ' to role: ' + roleName));

  }

  if (!roleArn && (!_.isEmpty(vpcConfig) || !_.isEmpty(nasConfig))) {
    console.log('\tattaching police \'AliyunECSNetworkInterfaceManagementAccess\' to role: ' + roleName);
    await attachPolicyToRole('AliyunECSNetworkInterfaceManagementAccess', roleName);
    console.log(green('\tattached police \'AliyunECSNetworkInterfaceManagementAccess\' to role: ' + roleName));
  }

  if (logConfig.Logstore && logConfig.Project) {
    if (!roleArn) {
      const logPolicyName = normalizeRoleOrPoliceName(`AliyunFcGeneratedLogPolicy-${profile.defaultRegion}-${serviceName}`);
      await makeAndAttachPolicy(logPolicyName, {
        'Version': '1',
        'Statement': [{
          'Action': [
            'log:PostLogStoreLogs'
          ],
          'Resource': `acs:log:*:*:project/${logConfig.Project}/logstore/${logConfig.Logstore}`,
          'Effect': 'Allow'
        }]
      }, roleName);
    }
  } else if (logConfig.LogStore || logConfig.Project) {
    throw new Error('LogStore and Project must both exist');
  }

  await makeService({
    serviceName,
    role: ((role || {}).Role || {}).Arn || roleArn || '',
    internetAccess,
    description: (serviceRes.Properties || {}).Description,
    logConfig,
    vpcConfig: vpcConfig,
    nasConfig: nasConfig
  });

  await deployFunctions(baseDir, serviceName, serviceRes, onlyConfig);
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

      console.log(green(`\tlog serivce logstore ${logstoreName} deploy success`));
    }
  }
}

async function deployCustomDomain(domainName, domainDefinition) {
  const properties = (domainDefinition.Properties || {});
  const protocol = properties.Protocol;
  const tplRouteConfig = properties.RouteConfig.Routes || properties.RouteConfig.routes;
  const certConfig = properties.CertConfig || {};
  var routes = [];
  var transRoute = Object.entries(tplRouteConfig);
  for (var route of transRoute) {
    let deformedRoute = _.mapKeys(route[1], (value, key) => {
      return _.lowerFirst(key);
    });
    deformedRoute.path = route[0];
    routes.push(deformedRoute);
  }
  var routeConfig = { routes };

  if (Reflect.ownKeys(certConfig).length === 0 && protocol === 'HTTP,HTTPS') {

    throw new Error(red(`\nMust config "CertConfig" for CustomDomain "${domainName}" when using "HTTP,HTTPS" protocol.\nYou can refer to https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlesscustomdomain\nor https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03.md/#aliyunserverlesscustomdomain for help.`));
  }

  if (Reflect.ownKeys(certConfig).length > 0 && protocol === 'HTTP') {

    throw new Error(red(`\nPlease don't use "CertConfig" config of CustomDomain "${domainName}" when using "HTTP" protocol.\nYou can refer to https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlesscustomdomain\nor https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03.md/#aliyunserverlesscustomdomain for help.`));
  }

  await makeCustomDomain({
    domainName,
    protocol,
    routeConfig,
    certConfig
  });
}


async function deployLogs(resourcesDefinition) {
  for (const [projectName, v] of Object.entries(resourcesDefinition)) {
    if ((v || {}).Type === 'Aliyun::Serverless::Log') {
      console.log(`Waiting for log service project ${projectName} to be deployed...`);
      const properties = (v || {}).Properties;

      const description = properties.Description || '';
      await makeSlsProject(projectName, description);

      await deployLogstore(projectName, v);
      console.log(green(`log serivce project ${projectName} deploy success\n`));
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

async function deployMNSTopic(topicName, topicDefinition) {
  const properties = (topicDefinition || {}).Properties;
  if (properties === undefined) {
    console.error('MNSTopic resource properties must not be empty');
    return;
  }

  console.log(`\tWaiting for MNS topic ${topicName} to be deployed...`);

  await makeMnsTopic(topicName, properties);

  console.log(green(`\tmns topic ${topicName} deploy success`));
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
          if (fcDefinition.role) {
            roleName = extractFcRole(fcDefinition.role);
          } else {
            roleName = `AliyunFcGeneratedApiGatewayRole`;
          }

          const role = await makeRole(roleName, true, 'API Gateway access FunctionCompute', {
            'Statement': [{
              'Action': 'sts:AssumeRole',
              'Effect': 'Allow',
              'Principal': {
                'Service': [
                  'apigateway.aliyuncs.com'
                ]
              }
            }],
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
            failResultSample: methodDefinition['x-aliyun-apigateway-fail-result-sample']
          };

          const requestConfig = methodDefinition['x-aliyun-apigateway-request-config'] || {};

          let openIdConnectConfig = methodDefinition['x-aliyun-apigateway-open-id-connect-config'];
          if (!openIdConnectConfig) {
            openIdConnectConfig = methodDefinition['x-aliyun-apigateway-openid-connect-config'];
          }

          const requestParameters = methodDefinition['x-aliyun-apigateway-request-parameters'];
          const serviceParameters = methodDefinition['x-aliyun-apigateway-service-parameters'];
          const serviceParametersMap = methodDefinition['x-aliyun-apigateway-service-parameters-map'];

          await makeApi(apiGroup, {
            stageName: apiDefinition.Properties.StageName,
            requestPath: k,
            method,
            roleArn: role.Role.Arn,
            apiName,
            serviceName,
            functionName,
            serviceTimeout,
            requestParameters,
            serviceParameters,
            serviceParametersMap,
            auth: {
              type: methodDefinition['x-aliyun-apigateway-auth-type'],
              config: openIdConnectConfig
            },
            visibility: methodDefinition['x-aliyun-apigateway-visibility'],
            requestConfig,
            resultConfig,
            description: methodDefinition['x-aliyun-apigateway-description'],
            forceNonceCheck: methodDefinition['x-aliyun-apigateway-force-nonce-check'],
            appCodeAuthType: methodDefinition['x-aliyun-apigateway-app-code-auth-type'],
            allowSignatureMethod: methodDefinition['x-aliyun-apigateway-allow-signature-method'],
            disableInternet: methodDefinition['x-aliyun-apigateway-disable-internet'],
            webSocketApiType: methodDefinition['x-aliyun-apigateway-websocket-api-type'],
            errorCodeSamples: methodDefinition['x-aliyun-apigateway-error-code-sample']
          });
        }
      }
    }
  }
}

async function partialDeployment(context, tpl) {

  const resourceName = context.resourceName;

  if (!resourceName) { return {}; }

  let serviceName;
  let serviceRes;

  const nameArray = resourceName.split('/');

  if (nameArray.length > 2) {

    throw new Error(`format error for local deployment: ` + red(`${resourceName}`) + `, the correct format is ` + green(`'serviceName/functionName' | 'serviceName' | 'functionName'`));
  }

  if (nameArray.length === 2) {

    const funcRes = definition.findServiceByCertainServiceAndFunctionName(tpl.Resources, _.first(nameArray), _.last(nameArray));

    serviceName = funcRes.serviceName;
    serviceRes = funcRes.serviceRes;
  } else if (nameArray.length === 1) {

    const matchRes = await definition.matchingFuntionUnderServiceBySourceName(tpl.Resources, _.first(nameArray));

    serviceName = matchRes.serviceName;
    serviceRes = matchRes.serviceRes;
  }

  return { serviceName, serviceRes };
}

function replaceServiceforSources(resources, serviceName, serviceRes) {

  let unMatchFuncArray = [];

  for (const [name, resource] of Object.entries(resources)) {

    if (resource.Type === 'Aliyun::Serverless::Service' && name !== serviceName) {

      unMatchFuncArray.push(name);
    }
  }

  resources = _.omit(resources, unMatchFuncArray);
  resources[serviceName] = serviceRes;

  return resources;
}

async function deployByApi(baseDir, tpl, tplPath, context) {
  await deployLogs(tpl.Resources);

  const { serviceName, serviceRes } = await partialDeployment(context, tpl);

  if (serviceName) {

    tpl.Resources = replaceServiceforSources(tpl.Resources, serviceName, serviceRes);
  }

  for (const [name, resource] of Object.entries(tpl.Resources)) {
    if (resource.Type === 'Aliyun::Serverless::Service') {
      const beforeDeployLog = context.onlyConfig ? 'config to be updated' : 'to be deployed';
      const afterDeployLog = context.onlyConfig ? 'config update success' : 'deploy success';

      console.log(`Waiting for service ${name} ${beforeDeployLog}...`);
      await deployService(baseDir, name, resource, context.onlyConfig);
      console.log(green(`service ${name} ${afterDeployLog}\n`));

    } else if (resource.Type === 'Aliyun::Serverless::Api') {
      console.log(`Waiting for api gateway ${name} to be deployed...`);
      await deployApigateway(name, {
        apiDefinition: resource,
        template: tpl,
        tplPath
      });
      console.log(green(`api gateway ${name} deploy success\n`));
    } else if (resource.Type === 'Aliyun::Serverless::TableStore') {
      console.log(`Waiting for table store ${name} to be deployed...`);
      await deployTablestore(name, resource);
      console.log(green(`table store ${name} deploy success\n`));
    } else if (resource.Type === 'Aliyun::Serverless::Log') {
      // ignore, done by deployLogs
    } else if (resource.Type === 'Aliyun::Serverless::CustomDomain') {
      console.log(`Waiting for custom domain ${name} to be deployed...`);
      await deployCustomDomain(name, resource);
      console.log(green(`custom domain ${name} deploy success\n`));
    } else if (resource.Type === 'Aliyun::Serverless::MNSTopic') {
      console.log(`Waiting for Mns topic ${name} to be deployed...`);
      await deployMNSTopic(name, resource);
      console.log(green(`table store ${name} deploy success\n`));
    } else {
      console.log('unknown resource %s', name);
    }
  }
}

async function deploy(tplPath, context) {

  if (!context.useRos) {
    await validate(tplPath);
  } else {
    // todo: ValidateTemplate
    // https://api.aliyun.com/#/?product=ROS&api=ValidateTemplate&tab=DEMO&lang=NODEJS
  }

  const profile = await getProfile();

  console.log(`using region: ${profile.defaultRegion}`);
  console.log(`using accountId: ${mark(profile.accountId)}`);
  console.log(`using accessKeyId: ${mark(profile.accessKeyId)}`);
  console.log(`using timeout: ${profile.timeout}`);

  console.log('');

  const tpl = await getTpl(tplPath);

  const baseDir = path.resolve(tplPath, '..');

  const dirName = path.basename(baseDir);

  const DEFAULT_STACK_NAME = `fun_default_stack_for_${dirName}`;

  if (context.useRos) {
    if (context.stackName) {
      console.log(yellow(`deploying by ROS, The Stack name is ${context.stackName}`));
    } else {
      console.log(yellow(`missing --stack-name parameter, using default stackName '${dirName}'`));
    }

    const stackName = context.stackName || DEFAULT_STACK_NAME;

    await deployByRos(baseDir, stackName, tpl, context.assumeYes);
  } else {
    await deployByApi(baseDir, tpl, tplPath, context);
  }
}

module.exports = {
  deploy, deployCustomDomain,
  partialDeployment, deployService
};