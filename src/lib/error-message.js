'use strict';

const {
  getProfile
} = require('./profile');
const { red } = require('colors');

function throwProcessedException(ex, policyName) {

  if (ex.code === 'Forbidden.RAM') {
    console.error(`\n${ex.message}`);
    throw new Error(`\nMaybe you need grant ${policyName} policy to the sub-account or use the primary account.\nIf you don’t want use the ${policyName} policy or primary account, you can also specify the Role property for Service.`);
  }
  throw ex;
}

async function throwProcessedPopPermissionError(ex, action) {
  if (!ex.code || !ex.url || (ex.code !== 'NoPermission' && ex.code !== 'Forbidden.RAM' && !ex.code.includes('Forbbiden'))) { // NAS 返回的权限错误码是 Forbbiden.ram
    throw ex;
  }
  const productRegex = new RegExp(/https?:\/\/([a-zA-Z]*).(.*)aliyuncs.com/);
  const productRegexRes = productRegex.exec(ex.url);
  if (!productRegexRes) {
    throw ex;
  }
  const product = productRegexRes[1];
  action = `${product}:${action}`;
  let resource = '*';
  if (ex.data && ex.data.Message) {
    const regex = new RegExp(/Resource: (.*) Action: (.*)/);
    const res = regex.exec(ex.data.Message);
    if (res) {
      resource = res[1];
      action = res[2];
    }
  }
  const policyName = generatePolicyName(action);
  printPermissionTip(policyName, action, resource);
  throw ex;
}

async function throwProcessedFCPermissionError(ex, ...resourceArr) {
  if (!ex.code || ex.code !== 'AccessDenied' || !ex.message) {
    throw ex;
  }
  const regex = new RegExp(/the caller is not authorized to perform '(.*)' on resource '(.*)'/);
  const res = regex.exec(ex.message);
  if (!res) {
    throw ex;
  }
  const profile = await getProfile();
  const action = res[1];
  const resource = res[2];
  const policyName = generatePolicyName(action, profile.defaultRegion, ...resourceArr);
  printPermissionTip(policyName, action, resource);
  throw ex;
}

async function throwProcessedSLSPermissionError(ex) {
  if (!ex.code || ex.code !== 'Unauthorized' || !ex.message) {
    throw ex;
  }
  const regex = new RegExp(/action: (.*), resource: (.*)/);
  const res = regex.exec(ex.message);
  if (!res) {
    throw ex;
  }
  const action = res[1];
  const resource = res[2];
  const policyName = generatePolicyName(action);
  printPermissionTip(policyName, action, resource);
  throw ex;
}

function printPermissionTip(policyName, action, resource) {
  const policy = {
    'Version': '1',
    'Statement': [
      {
        'Effect': 'Allow',
        'Action': [
          action
        ],
        'Resource': [
          resource
        ]
      }
    ]
  };
  console.error(red(`\nYou can run the following commands to grant permission '${action}' on '${resource}' `));
  console.error(red('Via the link:  https://shell.aliyun.com/ or aliyun cli'));
  console.error(red('(Note: aliyun cli tool needs to be configured with credentials that have related RAM permissions, such as primary account\'s AK)'));
  console.error(red('\n1. Create Policy'));
  console.error(red(`aliyun ram CreatePolicy --PolicyName ${policyName} --PolicyDocument "${JSON.stringify(policy).replace(/"/g, '\\"')}"`));
  console.error(red('\n2. Attach Policy To User'));
  console.error(red(`aliyun ram AttachPolicyToUser --PolicyName ${policyName} --PolicyType "Custom" --UserName "YOUR_USER_NAME"\n`));
}

function generatePolicyName(action, ...resourceArr) {
  const resource = resourceArr && resourceArr.length ? resourceArr.join('-') : Math.random().toString(36).slice(-8);
  return `fun-generated-${action.replace(/:/g, '-')}-${resource}`;
}

module.exports = {
  throwProcessedException,
  throwProcessedPopPermissionError,
  throwProcessedFCPermissionError,
  throwProcessedSLSPermissionError
};