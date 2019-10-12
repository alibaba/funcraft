'use strict';

const { normalizeRoleOrPoliceName } = require('../lib/ram');

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const ram = require('../lib/ram');
const Ram = require('@alicloud/ram');
const expect = require('expect.js');

const policy = {
  'Policies': {
    'Policy': [
      {
        'Description': '管理对象存储服务(OSS)权限',
        'PolicyName': 'AliyunOSSFullAccess',
        'AttachDate': '2019-10-12T02:09:55Z',
        'DefaultVersion': 'v1',
        'PolicyType': 'System'
      }
    ]
  },
  'RequestId': '762790B0-1D91-473A-A8C1-F6EF7B44427A'
};

describe('test normalizeRoleOrPoliceName', () => {
  it('test valid', () => {
    const roleName = normalizeRoleOrPoliceName('test-role-name');

    expect(roleName).to.be('test-role-name');
  });

  it('test invalid', () => {
    const roleName = normalizeRoleOrPoliceName('test_role_name');
    
    expect(roleName).to.be('test-role-name');
  });
});

describe('ram police capitalization test', () => {

  beforeEach(() => {

    sandbox.stub(Ram.prototype, 'listPoliciesForRole').resolves(policy);
    sandbox.stub(Ram.prototype, 'attachPolicyToRole');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('ram police lower case', async () => {
    const policyName = 'aliyunossfullaccess';
    await ram.attachPolicyToRole(policyName, 'roleName');

    assert.calledWith(Ram.prototype.listPoliciesForRole, {
      RoleName: 'roleName'
    });
    assert.notCalled(Ram.prototype.attachPolicyToRole);
  });

  it('ram police capital case', async () => {
    const policyName = 'ALIYUNOSSFULLACCESS';
    await ram.attachPolicyToRole(policyName, 'roleName');

    assert.calledWith(Ram.prototype.listPoliciesForRole, {
      RoleName: 'roleName'
    });
    assert.notCalled(Ram.prototype.attachPolicyToRole);
  });
});