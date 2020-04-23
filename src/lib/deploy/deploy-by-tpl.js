'use strict';

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const requestP = require('request-promise');
const constants = require('../nas/constants');
const validate = require('../validate/validate');
const debug = require('debug')('fun:deploy');
const definition = require('../definition');
const date = require('date-and-time');

const { deployByRos } = require('./deploy-support-ros');
const { importService } = require('../import/service');
const { getProfile, mark } = require('../profile');
const { showTipsForNasYml } = require('../build/tips');
const { green, yellow, red } = require('colors');
const { displayTriggerInfo } = require('../../lib/trigger');
const { showResourcesChanges } = require('./deploy-diffs');
const { parseYamlWithCustomTag } = require('../parse');
const { promptForConfirmContinue } = require('../init/prompt');
const { getNasMappingsFromNasYml } = require('../nas/support');
const { getTriggerNameList, makeTrigger } = require('../trigger');
const { getTpl, getRootBaseDir, getNasYmlPath } = require('../tpl');
const { transformFunctionInDefinition, transformFlowDefinition } = require('../fnf');
const { makeService, makeFunction, deleteFunction, makeFcUtilsFunctionTmpDomainToken } = require('../fc');

const _ = require('lodash');

const TMP_DOMAIN_URL = 'https://1813774388953700.cn-shanghai.fc.aliyuncs.com/2016-08-15/proxy/generate_tmp_domain_for_console.prod/generate_preview_domain_for_fun/';
const TMP_DOMAIN_EXPIRED_TIME_URL = 'https://1813774388953700.cn-shanghai.fc.aliyuncs.com/2016-08-15/proxy/generate_tmp_domain_for_console/get_expired_time/';

let {
  makeApi,
  makeFlow,
  makeApiTrigger,
  makeGroup,
  makeOtsTable,
  makeOtsInstance,
  makeMnsTopic,
  makeSlsProject,
  makeLogstore,
  makeLogstoreIndex,
  makeCustomDomain,
  listCustomDomains
} = require('./deploy-support');

let {
  makeRole,
  attachPolicyToRole,
  makeAndAttachPolicy,
  normalizeRoleOrPoliceName,
  FNF_ASSUME_ROLE_POLICY
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
  if (_.isEmpty(events)) { return; }

  let localTriggerNames = Object.keys(events);
  let onLineTriggerNames = await getTriggerNameList({ serviceName, functionName });

  onLineTriggerNames.filter(x => !_.includes(localTriggerNames, x)).forEach(element => {
    console.warn(red(`\t\tThe trigger ${element} you configured in fc console does not match the local configuration.\n\t\tFun will not modify this trigger. You can remove this trigger manually through fc console if necessary`));
  });

  for (const [triggerName, triggerDefinition] of Object.entries(events)) {
    console.log(`\t\tWaiting for ${yellow(triggerDefinition.Type)} trigger ${triggerName} to be deployed...`);
    await deployTrigger(serviceName, functionName, triggerName, triggerDefinition);
    await displayTriggerInfo(serviceName, functionName, triggerName, triggerDefinition.Type, triggerDefinition.Properties, '\t\t');
    console.log(green(`\t\ttrigger ${triggerName} deploy success`));
  }
}

async function deployFunction({ baseDir, nasConfig, vpcConfig, useNas, assumeYes,
  serviceName, functionName, functionRes,
  onlyConfig, tplPath, skipTrigger = false
}) {
  const properties = functionRes.Properties || {};

  const rs = await makeFunction(baseDir, {
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
    instanceConcurrency: properties.InstanceConcurrency,
    nasConfig,
    vpcConfig
  }, onlyConfig, tplPath, useNas, assumeYes);

  if (!skipTrigger) {
    await deployTriggers(serviceName, functionName, functionRes.Events);
  }

  return rs;
}

async function reloadServiceRes(tplPath, name) {

  const tpl = await getTpl(tplPath);

  for (let { serviceName, serviceRes } of definition.findServices(tpl.Resources)) {
    if (name === serviceName) {
      return serviceRes;
    }
  }
  return {};
}

async function deployFunctions({ baseDir, serviceName, serviceRes, onlyConfig, tplPath, skipTrigger, useNas, assumeYes }) {
  const serviceProps = serviceRes.Properties || {};

  let deployedFunctions = [];
  let tplChanged;

  do {
    tplChanged = false;

    for (const [k, v] of Object.entries(serviceRes)) {
      if ((v || {}).Type === 'Aliyun::Serverless::Function') {
        if (_.includes(deployedFunctions, k)) { continue; }

        const beforeDeployLog = onlyConfig ? 'config to be updated' : 'to be deployed';
        const afterDeployLog = onlyConfig ? 'config update success' : 'deploy success';

        console.log(`\tWaiting for function ${k} ${beforeDeployLog}...`);

        const rs = await deployFunction({ baseDir, serviceName, onlyConfig, tplPath, skipTrigger, useNas,
          functionName: k,
          functionRes: v,
          nasConfig: serviceProps.NasConfig,
          vpcConfig: serviceProps.VpcConfig,
          assumeYes
        });
        deployedFunctions.push(k);
        console.log(green(`\tfunction ${k} ${afterDeployLog}`));

        if (rs.tplChanged) {
          serviceRes = await reloadServiceRes(tplPath, serviceName);
          tplChanged = true;
          break;
        }
      }
    }
  } while (tplChanged);
}

async function deployPolicy(resourceName, roleName, policy, curCount, product = 'Fc') {
  if (typeof policy === 'string') {
    await attachPolicyToRole(policy, roleName);
    return curCount;
  }

  const profile = await getProfile();

  const policyName = normalizeRoleOrPoliceName(`Aliyun${product}GeneratedServicePolicy-${profile.defaultRegion}-${resourceName}${curCount}`);

  await makeAndAttachPolicy(policyName, policy, roleName);

  return curCount + 1;
}

async function deployPolicies(resourceName, roleName, policies, product) {

  let nextCount = 1;

  if (Array.isArray(policies)) {
    for (let policy of policies) {
      nextCount = await deployPolicy(resourceName, roleName, policy, nextCount, product);
    }
  } else {
    nextCount = await deployPolicy(resourceName, roleName, policies, nextCount, product);
  }
}

function generateRoleNameSuffix(serviceName) {
  if (serviceName.startsWith(constants.FUN_NAS_SERVICE_PREFIX)) {
    return serviceName.substring(constants.FUN_NAS_SERVICE_PREFIX.length);
  }
  return serviceName;
}

async function generateServiceRole({ serviceName, vpcConfig, nasConfig,
  logConfig, roleArn, policies
}) {

  const profile = await getProfile();
  const defaultRegion = profile.defaultRegion;

  let role;
  let roleName;
  let createRoleIfNotExist = false;

  if (_.isNil(roleArn)) {
    roleName = `aliyunfcgeneratedrole-${defaultRegion}-${generateRoleNameSuffix(serviceName)}`;
    roleName = normalizeRoleOrPoliceName(roleName);
    createRoleIfNotExist = true;
  } else {
    try {
      roleName = extractFcRole(roleArn);
    } catch (ex) {
      throw new Error('The role you provided is not correct. You must provide the correct role arn.');
    }
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
    console.log('\tattaching policies ' + JSON.stringify(policies) + ' to role: ' + roleName);
    await deployPolicies(serviceName, roleName, policies);
    console.log(green('\tattached policies ' + JSON.stringify(policies) + ' to role: ' + roleName));
  }

  if (!roleArn && (!_.isEmpty(vpcConfig) || !_.isEmpty(nasConfig))) {
    console.log('\tattaching police \'AliyunECSNetworkInterfaceManagementAccess\' to role: ' + roleName);
    await attachPolicyToRole('AliyunECSNetworkInterfaceManagementAccess', roleName);
    console.log(green('\tattached police \'AliyunECSNetworkInterfaceManagementAccess\' to role: ' + roleName));
  }

  if (logConfig.Logstore && logConfig.Project) {
    if (!roleArn) {
      const logPolicyName = normalizeRoleOrPoliceName(`AliyunFcGeneratedLogPolicy-${defaultRegion}-${serviceName}`);
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
  } else if (definition.isLogConfigAuto(logConfig)) {
    if (!roleArn) {
      console.log('\tattaching police \'AliyunLogFullAccess\' to role: ' + roleName);
      await attachPolicyToRole('AliyunLogFullAccess', roleName);
      console.log(green('\tattached police \'AliyunLogFullAccess\' to role: ' + roleName));
    }
  }

  return ((role || {}).Role || {}).Arn || roleArn || '';
}

async function deployService({ baseDir, serviceName, serviceRes, onlyConfig, tplPath, skipTrigger = false, useNas, assumeYes }) {
  const properties = (serviceRes.Properties || {});

  const internetAccess = 'InternetAccess' in properties ? properties.InternetAccess : null;
  const description = properties.Description;

  const vpcConfig = properties.VpcConfig;
  const nasConfig = properties.NasConfig;
  const logConfig = properties.LogConfig || {};

  const role = await generateServiceRole({
    serviceName, vpcConfig, nasConfig, logConfig,
    roleArn: properties.Role,
    policies: properties.Policies
  });

  await makeService({
    serviceName,
    role,
    internetAccess,
    description,
    logConfig,
    vpcConfig: vpcConfig,
    nasConfig: nasConfig
  });

  await deployFunctions({ baseDir, serviceName, serviceRes, onlyConfig, tplPath, skipTrigger, useNas, assumeYes });
}

async function deployLogstoreDefaultIndex(projectName, logstoreName) {
  console.log(`\t\tWaiting for log service logstore ${logstoreName} default index to be deployed...`);
  await makeLogstoreIndex(projectName, logstoreName);
  console.log(green(`\t\tlog service logstore ${logstoreName} default index deploy success`));
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

async function sendHttpRequest(method, url, requestData) {
  return await requestP({
    method,
    uri: url,
    body: requestData,
    json: true // Automatically stringifies the body to JSON
  });
}

function convertRoutesConfigToRoutes(routeConfig) {
  const routes = [];
  for (const route of Object.entries(routeConfig)) {
    let deformedRoute = _.mapKeys(route[1], (value, key) => {
      return _.lowerFirst(key);
    });
    deformedRoute.path = route[0];
    routes.push(deformedRoute);
  }
  return routes;
}

async function processTemporaryDomain(resources, { serviceName, functionName }, protocol) {
  const profile = await getProfile();
  const region = profile.defaultRegion;
  const accountId = profile.accountId;

  const tokenRs = await sendHttpRequest('POST', TMP_DOMAIN_URL, { accountID: accountId, region });
  const token = tokenRs.token;

  const { functionRes } = definition.findFunctionByServiceAndFunctionName(resources, serviceName, functionName);

  if (_.isEmpty(functionRes)) {
    throw new Error(`could not found service/function：${serviceName}/${functionName}`);
  }

  const { tmpServiceName, tmpFunctionName, tmpTriggerName } = await makeFcUtilsFunctionTmpDomainToken(token);

  const domainRs = await sendHttpRequest('POST', TMP_DOMAIN_URL, { accountID: accountId, region, token });
  const domainName = domainRs.domain;

  await deleteFunction(tmpServiceName, tmpFunctionName, tmpTriggerName);

  const { expiredTime, timesLimit, expiredTimeObj } = await getTmpDomainExpiredTime(domainName);

  const currentTimestamp = Math.round(new Date().getTime() / 1000);

  if (expiredTime > currentTimestamp) {
    console.log(`The assigned temporary domain is ${yellow(parseProtocol(protocol, domainName))}，expired at ${yellow(date.format(expiredTimeObj, 'YYYY-MM-DD HH:mm:ss'))}, limited by ${yellow(timesLimit)} per day.`);
  } else {
    console.log(`The temporary domain ${yellow(parseProtocol(protocol, domainName))} of previous depoyment is expried.`);
  }

  return domainName;
}

async function getTmpDomainExpiredTime(domainName) {
  const expiredTimeRs = await sendHttpRequest('POST', TMP_DOMAIN_EXPIRED_TIME_URL, { domain: domainName });

  const expiredTime = expiredTimeRs.expired_time;
  const timesLimit = expiredTimeRs.times_limit;
  const expiredTimeObj = new Date(expiredTime * 1000);

  return {
    expiredTime, // unix timestamp(m)
    timesLimit,
    expiredTimeObj
  };
}

function parseProtocol(protocol, domainName) {
  const resolveProtocol = protocol === 'HTTP' ? 'http://' : 'https://';
  return resolveProtocol + domainName;
}

async function getReuseTmpDomainName(tplRoutes) {
  const customDomains = await listCustomDomains();

  const tmpDomains = customDomains.filter(f => {
    return _.endsWith(f.domainName, '.test.functioncompute.com');
  });

  if (_.isEmpty(tmpDomains)) { return null; }

  for (const tmpDomain of tmpDomains) {
    const routes = tmpDomain.routeConfig.routes;
    const tmpDomainName = tmpDomain.domainName;
    const protocol = tmpDomain.protocol;

    for (const route of routes) {

      for (const tplRoute of tplRoutes) {
        if (tplRoute.serviceName === route.serviceName && tplRoute.functionName === route.functionName) {

          const { expiredTime, timesLimit, expiredTimeObj } = await getTmpDomainExpiredTime(tmpDomainName);

          if (expiredTime > Math.round(new Date().getTime() / 1000)) {
            console.log(`Fun will reuse the temporary domain ${yellow(parseProtocol(protocol, tmpDomainName))}, expired at ${yellow(date.format(expiredTimeObj, 'YYYY-MM-DD HH:mm:ss'))}, limited by ${yellow(timesLimit)} per day.\n`);
            return tmpDomainName;
          }
        }
      }
    }
  }
  return null;
}

async function processTemporaryDomainIfNecessary(domainLogicId, domainDefinition, resources) {
  const properties = (domainDefinition.Properties || {});

  const protocol = properties.Protocol;
  const realDomainName = properties.DomainName;
  const routesConfig = properties.RouteConfig.Routes || properties.RouteConfig.routes;

  const routes = convertRoutesConfigToRoutes(routesConfig);

  if (!realDomainName) {
    return {
      routes,
      domainName: domainLogicId
    };
  }

  if (realDomainName !== 'Auto') {
    return {
      routes,
      domainName: realDomainName
    };
  }
  console.log(yellow(`Detect 'DomainName:Auto' of custom domain '${domainLogicId}'`));
  const tmpDomainName = await getReuseTmpDomainName(routes);

  if (tmpDomainName) {
    return {
      routes,
      domainName: tmpDomainName
    };
  }
  console.log(`Request a new temporary domain ...`);
  const domainName = await processTemporaryDomain(resources, _.head(_.values(routes)), protocol);

  return {
    routes,
    domainName
  };
}

async function deployCustomDomain(domainName, domainDefinition, routes) {
  const properties = (domainDefinition.Properties || {});
  const certConfig = properties.CertConfig || {};
  const protocol = properties.Protocol;

  if (_.isEmpty(certConfig) && protocol === 'HTTP,HTTPS') {
    throw new Error(red(`\nMust config "CertConfig" for CustomDomain "${domainName}" when using "HTTP,HTTPS" protocol.\nYou can refer to https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlesscustomdomain\nor https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03.md/#aliyunserverlesscustomdomain for help.`));
  }
  if (!_.isEmpty(certConfig) && protocol === 'HTTP') {
    throw new Error(red(`\nPlease don't use "CertConfig" config of CustomDomain "${domainName}" when using "HTTP" protocol.\nYou can refer to https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03-zh-cn.md#aliyunserverlesscustomdomain\nor https://github.com/aliyun/fun/blob/master/docs/specs/2018-04-03.md/#aliyunserverlesscustomdomain for help.`));
  }

  await makeCustomDomain({ domainName, certConfig, protocol, routeConfig: { routes } });
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
      const swaggerContent = await fs.readFile(swaggerPath, 'utf8');
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

async function partialDeployment(sourceName, tpl) {
  if (!sourceName) { return {}; }

  const nameArray = sourceName.split('/');

  if (nameArray.length > 2) {

    throw new Error(`format error for local deployment: ` + red(`${sourceName}`) + `, the correct format is ` + green(`'serviceName/functionName' | 'serviceName' | 'functionName' | 'flowName'`));
  }

  if (nameArray.length === 2) {

    const funcRes = definition.findServiceByCertainServiceAndFunctionName(tpl.Resources, _.first(nameArray), _.last(nameArray));

    return {
      resourceName: funcRes.serviceName,
      resourceRes: funcRes.serviceRes
    };
  } else if (nameArray.length === 1) {

    const matchRes = await definition.matchingResourceBySourceName(tpl.Resources, _.first(nameArray));

    return {
      resourceName: matchRes.resourceName,
      resourceRes: matchRes.resourceRes
    };
  }

  return {};
}

async function deployTplService({ baseDir, serviceName, serviceRes, onlyConfig, tplPath, useNas, assumeYes }) {

  const beforeDeployLog = onlyConfig ? 'config to be updated' : 'to be deployed';
  const afterDeployLog = onlyConfig ? 'config update success' : 'deploy success';

  console.log(`Waiting for service ${serviceName} ${beforeDeployLog}...`);
  await deployService({ baseDir, serviceName, serviceRes, onlyConfig, tplPath, useNas, assumeYes });
  console.log(green(`service ${serviceName} ${afterDeployLog}\n`));
}

async function deployFlow(name, resource, tpl, parameterOverride = {}, baseDir) {
  const properties = (resource.Properties || {});
  const description = properties.Description || '';
  let definition;
  if (properties.Definition) {
    definition = transformFlowDefinition(properties.Definition, tpl, parameterOverride);
  } else if (properties.DefinitionUri) {
    const definitionUri = path.resolve(baseDir, properties.DefinitionUri);
    const definitionObj = parseYamlWithCustomTag(properties.DefinitionUri, await fs.readFile(definitionUri, 'utf8'));
    ({ definition } = transformFunctionInDefinition(definitionObj, tpl, parameterOverride));
  } else {
    throw new Error(`${name} should have Definition or DefinitionUri`);
  }
  const roleArn = properties.Role;
  const policies = properties.Policies;

  const profile = await getProfile();
  const defaultRegion = profile.defaultRegion;

  let role;
  let roleName;
  if (!roleArn && policies) {
    roleName = `aliyunfnfgeneratedrole-${defaultRegion}-${name}`;
    roleName = normalizeRoleOrPoliceName(roleName);
    console.log(`\tmake sure role '${roleName}' is exist`);
    role = await makeRole(
      roleName,
      true,
      'Function Flow Default Role',
      FNF_ASSUME_ROLE_POLICY
    );
    console.log(green(`\trole '${roleName}' is already exist`));
    console.log('\tattaching policies ' + policies + ' to role: ' + roleName);
    await deployPolicies(name, roleName, policies, 'FnF');
    console.log(green('\tattached policies ' + policies + ' to role: ' + roleName));
  }

  await makeFlow({
    name,
    definition,
    description,
    roleArn: ((role || {}).Role || {}).Arn || roleArn
  });
}

async function fetchRemoteYml(baseDir, tpl) {
  const importTmpDir = path.join(baseDir, '.fun', 'tmp', 'deploy');
  const importYmlPath = path.join(importTmpDir, 'template.yml');

  await fs.ensureDir(importTmpDir);
  await fs.remove(importYmlPath);

  const services = definition.findServices(tpl.Resources);

  console.log('Collecting your services information, in order to caculate devlopment changes...');

  for (const service of services) {
    const originConsoleLog = console.log;
    console.log = debug;
    try {
      await importService(service.serviceName, importTmpDir, true, true, true);
    } catch (e) {
      debug('import service error', e);
    }
    console.log = originConsoleLog;
  }

  if (!await fs.pathExists(importYmlPath)) {
    return {
      Resources: {}
    };
  }

  return await getTpl(importYmlPath);
}

async function deployByApi(baseDir, tpl, tplPath, context) {

  const remoteYml = await fetchRemoteYml(baseDir, tpl);

  const { resourceName, resourceRes } = await partialDeployment(context.resourceName, tpl);

  if (resourceName) {
    const { Type: resourceType = '' } = resourceRes;
    if (resourceType === definition.SERVICE_RESOURCE) {

      await showResourcesChanges({ Resources: { [resourceName]: resourceRes } }, remoteYml);

      if (!context.assumeYes && !await promptForConfirmContinue('Please confirm to continue.')) { return; }

      await deployTplService({ baseDir, tplPath,
        serviceName: resourceName,
        serviceRes: resourceRes,
        useNas: context.useNas,
        onlyConfig: context.onlyConfig
      });
    } else if (resourceType === definition.FLOW_RESOURCE) {
      await deployFlow(resourceName, resourceRes, tpl, context.parameterOverride, baseDir);
    } else {
      throw new Error(`${resourceName} can not be partial deploy`);
    }
    return;
  }

  await showResourcesChanges(tpl, remoteYml);

  if (!context.assumeYes && !await promptForConfirmContinue('Please confirm to continue.')) { return; }

  await deployLogs(tpl.Resources);

  for (const [name, resource] of Object.entries(tpl.Resources)) {
    if (resource.Type === 'Aliyun::Serverless::Service') {

      await deployTplService({ baseDir, tplPath,
        serviceName: name,
        serviceRes: resource,
        useNas: context.useNas,
        onlyConfig: context.onlyConfig,
        assumeYes: context.assumeYes
      });
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
      const { domainName, routes } = await processTemporaryDomainIfNecessary(name, resource, tpl.Resources);

      console.log(`Waiting for custom domain ${name} to be deployed...`);
      await deployCustomDomain(domainName, resource, routes);
      console.log(green(`custom domain ${name} deploy success\n`));
    } else if (resource.Type === 'Aliyun::Serverless::MNSTopic') {
      console.log(`Waiting for Mns topic ${name} to be deployed...`);
      await deployMNSTopic(name, resource);
      console.log(green(`table store ${name} deploy success\n`));
    } else if (resource.Type === 'Aliyun::Serverless::Flow') {
      console.log(`Waiting for flow ${name} to be deployed...`);
      await deployFlow(name, resource, tpl, context.parameterOverride, baseDir);
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
  console.log(`using timeout: ${profile.timeout}\n`);

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
    await deployByRos(baseDir, stackName, tpl, context.assumeYes, context.parameterOverride);
  } else {

    await deployByApi(baseDir, tpl, tplPath, context);
    const serviceNasMappings = await getNasMappingsFromNasYml(getNasYmlPath(tplPath));
    showTipsForNasYml(getRootBaseDir(baseDir), serviceNasMappings);
  }
}

module.exports = {
  deploy, deployCustomDomain,
  partialDeployment, deployService, deployByApi
};