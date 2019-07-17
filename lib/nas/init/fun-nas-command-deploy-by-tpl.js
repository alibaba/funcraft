/* eslint-disable no-unused-vars */
'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
// eslint-disable-next-line no-unused-vars

const { getProfile, mark } = require('../../profile');

const getTpl = require('../../tpl').getTpl;
const validate = require('../../validate/validate');


const { green} = require('colors');

const readFile = util.promisify(fs.readFile);
const _ = require('lodash');

const { makeService, makeFunction } = require('../../fc');

const FUN_NAS_SERVICE_PREFIX = 'fun-nas-';
const FUN_NAS_FUNCTION = 'fun-nas-function';
const OSSURI = 'oss://buc-demo/fun-nas-proj.zip';
const TRIGGER_NAME = 'httpTrigger';
const TRIGGER_TYPE = 'HTTP';
const TRIGGER_PROPERITIES = {
  AuthType: 'anonymous',
  Methods: ['POST', 'GET']
};

let {
  makeRole,
  attachPolicyToRole,
  makeAndAttachPolicy,
  normalizeRoleOrPoliceName
} = require('../../ram');

function extractFcRole(role) {
  const [, , , , path] = role.split(':');
  const [, roleName] = path.split('/');
  return roleName;
}


async function deployFunction(baseDir, serviceName) {
  var functionName = FUN_NAS_FUNCTION;
  var triggerName = TRIGGER_NAME;
  var triggerType = TRIGGER_TYPE;
  var triggerProperties = TRIGGER_PROPERITIES;
  await makeFunction(baseDir, {
    serviceName: serviceName,
    functionName: functionName,
    codeUri: OSSURI,
    description: 'fun nas command function',
    handler: 'index.handler',
    runtime: 'nodejs8'
  });
  //await require('../../deploy/deploy-by-tpl').deployTrigger(serviceName, FUN_NAS_FUNCTION, 'HTTP', '');
  
  await require('../../trigger').makeTrigger(
    {
      serviceName,
      functionName,
      triggerName,
      triggerType: triggerType,
      triggerProperties: triggerProperties
    }
  );
  
  console.log(green(`\t\tfunction ${triggerName} deploy success`));
}

async function getFcNasFunctionCode(filename) {
  var dirname = path.resolve(__dirname, '..', '..');
  const functionCode = await readFile(path.join(dirname, 'fc-utils', filename));

  const codes = {
    'index.js': functionCode
  };

  return codes;
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

async function deployService(baseDir, serviceName, serviceRes) {
  const properties = (serviceRes.Properties || {});
  const roleArn = properties.Role;  
  const policies = properties.Policies;
  
  const vpcConfig = properties.VpcConfig;
  const nasConfig = properties.NasConfig;
  const logConfig = properties.LogConfig || {};

  if (_.isEmpty(vpcConfig)) {
    console.log('Lake of vpcConfig, please add your vpc config and retry.');
    return;
  }
  if (_.isEmpty(nasConfig)) {
    console.log('Lake of nasConfig, please add your nas config and retry.');
    return;
  }

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
  if (!roleArn && (policies || !_.isEmpty(vpcConfig) || !_.isEmpty(logConfig) || !_.isEmpty(logConfig) || !_.isEmpty(nasConfig))) {
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
    description: 'fun nas command service',
    vpcConfig: vpcConfig,
    nasConfig: nasConfig
  });

  console.log(`\tWaiting for fc nas function to be deployed...`);

  //const codes = await getFcNasFunctionCode('fc-nas-command.js');

  await deployFunction(baseDir, serviceName);
  console.log(green(`\tfc nas function deploy success`));
}

async function deployNasFunction(tplPath) {
  await validate(tplPath);

  const profile = await getProfile();

  console.log(`using region: ${profile.defaultRegion}`);
  console.log(`using accountId: ${mark(profile.accountId)}`);
  console.log(`using accessKeyId: ${mark(profile.accessKeyId)}`);
  console.log(`using timeout: ${profile.timeout}`);

  console.log('');

  const tpl = await getTpl(tplPath);
  
  const baseDir = path.resolve(tplPath, '..');

  for (const [name, resource] of Object.entries(tpl.Resources)) {
    if (resource.Type === 'Aliyun::Serverless::Service') {
      console.log(`Waiting for service ${name} to be deployed...`);
      var serviceName = FUN_NAS_SERVICE_PREFIX + name;
      
      await deployService(baseDir, serviceName, resource);
      console.log(green(`service ${name} deploy success\n`));
    } 
  }
}

module.exports = { deployNasFunction };