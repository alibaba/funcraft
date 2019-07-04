'use strict';

let trigger = require('../lib/trigger');
const FC = require('@alicloud/fc2');
const ram = require('../lib/ram');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const { setProcess } = require('./test-utils');
const proxyquire = require('proxyquire');
const expect = require('expect.js');

describe('test config invovationRole fot trigger', ()=> {
  let restoreProcess;

  beforeEach(async () => {
    sandbox.stub(FC.prototype, 'getTrigger').resolves(undefined);
    sandbox.stub(FC.prototype, 'createTrigger').resolves({});

    Object.keys(ram).forEach(m => {
      if (m === 'makeRole') {
        sandbox.stub(ram, m).resolves({
          'Role': {
            'Arn': 'acs:ram::123:role/aliyunfcgeneratedrole-fc'
          }
        });
      } else if (m === 'normalizeRoleOrPoliceName') {
        sandbox.stub(ram, 'normalizeRoleOrPoliceName').returns('');
      } else {
        sandbox.stub(ram, m).resolves({});
      }
    });

    trigger = await proxyquire('../lib/trigger', {
      '@alicloud/fc2': FC,
      './ram': ram
    });

    restoreProcess = setProcess({
      ACCOUNT_ID: 'ACCOUNT_ID',
      ACCESS_KEY_ID: 'ACCESS_KEY_ID',
      ACCESS_KEY_SECRET: 'ACCESS_KEY_SECRET',
      DEFAULT_REGION: 'cn-shanghai'
    });
  });

  afterEach(() => {
    sandbox.restore();
    restoreProcess();
  });

  it('invocationRole  ots trigger ', async ()=> {
    await trigger.makeTrigger(
      {
        serviceName: 'serviceName', 
        functionName: 'functionName', 
        triggerName: 'triggerName', 
        triggerType: 'TableStore',
        triggerProperties: {
          'InstanceName': 'fc-test-inst',
          'TableName': 'fc_test_tbl',
          'InvocationRole': 'acs:ram::987:role/invocation-role-test'
        }
      });    

    assert.notCalled(ram.makeRole);
    assert.notCalled(ram.makePolicy);
    assert.notCalled(ram.makeAndAttachPolicy);
    assert.notCalled(ram.attachPolicyToRole);  

    assert.calledWith(
      FC.prototype.createTrigger,
      'serviceName',
      'functionName',
      {
        'triggerName': 'triggerName',
        'triggerType': 'tablestore',
        'triggerConfig': {},
        'invocationRole': 'acs:ram::987:role/invocation-role-test',
        'sourceArn': 'acs:ots:cn-shanghai:ACCOUNT_ID:instance/fc-test-inst/table/fc_test_tbl'

      });
  });
});

describe('make invocation role', () => {

  let restoreProcess;

  beforeEach(async () => {

    sandbox.stub(ram, 'makeRole').resolves({
      Role: 'generated-role-name'
    });
    sandbox.stub(ram, 'makePolicy').resolves({});
    sandbox.stub(ram, 'attachPolicyToRole').resolves({});

    trigger = await proxyquire('../lib/trigger', {
      './ram': ram
    });

    restoreProcess = setProcess({
      ACCOUNT_ID: 'testAccountId',
      ACCESS_KEY_ID: 'testKeyId',
      ACCESS_KEY_SECRET: 'testKeySecret',
      DEFAULT_REGION: 'cn-shanghai'
    });
  });

  afterEach(() => {
    sandbox.restore();
    restoreProcess();
  });

  it('makeInvocationRole of log', async () => {
    const role = await trigger.makeInvocationRole('test-service_name', 'test-function_name', 'Log');

    assert.calledOnce(ram.makeRole);
    assert.calledWith(ram.makeRole,
      'AliyunFcGeneratedInvocationRole-test-service-name-test-function-name',
      true,
      'Used for fc invocation',
      {
        Statement: [{
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: { Service: ['log.aliyuncs.com'] }
        }],
        Version: '1'
      });

    assert.calledOnce(ram.makePolicy);
    assert.calledWith(ram.makePolicy, 'AliyunFcGeneratedInvocationPolicy-test-service-name-test-function-name',
      {
        Statement: [{
          Action: ['fc:InvokeFunction'],
          Effect: 'Allow',
          Resource: 'acs:fc:*:*:services/test-service_name/functions/*'
        }, {
          Action: ['log:Get*', 'log:List*', 'log:PostLogStoreLogs', 'log:CreateConsumerGroup', 'log:UpdateConsumerGroup', 'log:DeleteConsumerGroup', 'log:ListConsumerGroup', 'log:ConsumerGroupUpdateCheckPoint', 'log:ConsumerGroupHeartBeat', 'log:GetConsumerGroupCheckPoint'],
          Effect: 'Allow',
          Resource: '*'
        }],
        Version: '1'
      });

    assert.calledOnce(ram.attachPolicyToRole);
    assert.calledWith(ram.attachPolicyToRole, 'AliyunFcGeneratedInvocationPolicy-test-service-name-test-function-name', 'AliyunFcGeneratedInvocationRole-test-service-name-test-function-name', 'Custom');

    expect(role).to.be('generated-role-name');
  });

  it('makeInvocationRole of rds', async () => {
    const role = await trigger.makeInvocationRole('test-service_name', 'test-function_name', 'RDS');

    assert.calledOnce(ram.makeRole);
    assert.calledWith(ram.makeRole,
      'FunCreateRole-test-service-name-test-function-name',
      true,
      'Used for fc invocation',
      {
        Statement: [{
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: { Service: ['rds.aliyuncs.com'] }
        }],
        Version: '1'
      });

    assert.calledOnce(ram.makePolicy);
    assert.calledWith(ram.makePolicy, 'FunCreatePolicy-test-service-name-test-function-name',
      {
        Statement: [{
          Action: ['fc:InvokeFunction'],
          Effect: 'Allow',
          Resource: 'acs:fc:*:*:services/test-service_name/functions/*'
        }],
        Version: '1'
      });

    assert.calledOnce(ram.attachPolicyToRole);
    assert.calledWith(ram.attachPolicyToRole, 'FunCreatePolicy-test-service-name-test-function-name', 'FunCreateRole-test-service-name-test-function-name', 'Custom');

    expect(role).to.be('generated-role-name');
  });

  it('makeInvocationRole of mns topic', async () => {
    const role = await trigger.makeInvocationRole('test-service_name', 'test-function_name', 'MNSTopic');

    assert.calledOnce(ram.makeRole);
    assert.calledWith(ram.makeRole,
      'FunCreateRole-test-service-name-test-function-name',
      true,
      'Used for fc invocation',
      {
        Statement: [{
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: { Service: ['mns.aliyuncs.com'] }
        }],
        Version: '1'
      });

    assert.calledOnce(ram.makePolicy);
    assert.calledWith(ram.makePolicy, 'FunCreatePolicy-test-service-name-test-function-name',
      {
        Statement: [{
          Action: ['fc:InvokeFunction'],
          Effect: 'Allow',
          Resource: 'acs:fc:*:*:services/test-service_name/functions/*'
        }],
        Version: '1'
      });

    assert.calledOnce(ram.attachPolicyToRole);
    assert.calledWith(ram.attachPolicyToRole, 'FunCreatePolicy-test-service-name-test-function-name', 'FunCreateRole-test-service-name-test-function-name', 'Custom');

    expect(role).to.be('generated-role-name');
  });

  it('makeInvocationRole of table store', async () => {
    const role = await trigger.makeInvocationRole('test-service_name', 'test-function_name', 'TableStore');

    assert.calledOnce(ram.makeRole);
    assert.calledWith(ram.makeRole,
      'FunCreateRole-test-service-name-test-function-name',
      true,
      'Used for fc invocation',
      {
        Statement: [{
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: { RAM: ['acs:ram::1604337383174619:root'] } }],
        Version: '1'
      });

    assert.calledTwice(ram.makePolicy);
    assert.calledWith(ram.makePolicy.firstCall, 'FunCreateInvkPolicy-test-service-name-test-function-name',
      {
        Statement: [{ Action: ['fc:InvokeFunction'], Effect: 'Allow', Resource: '*' }],
        Version: '1'
      });
    assert.calledWith(ram.makePolicy.secondCall, 'FunCreateOtsReadPolicy-test-service-name-test-function-name',
      {
        Statement: [{
          Action: ['ots:BatchGet*', 'ots:Describe*', 'ots:Get*', 'ots:List*'],
          Effect: 'Allow',
          Resource: '*'
        }],
        Version: '1'
      });

    assert.calledTwice(ram.attachPolicyToRole);
    assert.calledWith(ram.attachPolicyToRole.firstCall, 'FunCreateInvkPolicy-test-service-name-test-function-name', 'FunCreateRole-test-service-name-test-function-name', 'Custom');
    assert.calledWith(ram.attachPolicyToRole.secondCall, 'FunCreateOtsReadPolicy-test-service-name-test-function-name', 'FunCreateRole-test-service-name-test-function-name', 'Custom');

    expect(role).to.be('generated-role-name');
  });

  it('makeInvocationRole of oss', async () => {
    const role = await trigger.makeInvocationRole('oss-service_name', 'oss-function_name', 'OSS');

    assert.calledOnce(ram.makeRole);
    assert.calledWith(ram.makeRole,
      'FunCreateRole-oss-service-name-oss-function-name',
      true,
      'Used for fc invocation',
      {
        Statement: [
          {
            'Action': 'sts:AssumeRole',
            'Effect': 'Allow',
            'Principal': {
              'Service': [
                'oss.aliyuncs.com'
              ]
            }
          }
        ],
        Version: '1'
      });

    assert.calledWith(ram.makePolicy, 'FunCreateOSSPolicy-oss-service-name-oss-function-name',
      {
        Statement: [{
          'Action': [
            'fc:InvokeFunction'
          ],
          'Resource': `acs:fc:*:*:services/oss-service_name/functions/*`,
          'Effect': 'Allow'
        }],
        Version: '1'
      });
    assert.calledOnce(ram.attachPolicyToRole);
    assert.calledWith(ram.attachPolicyToRole, 'FunCreateOSSPolicy-oss-service-name-oss-function-name', 'FunCreateRole-oss-service-name-oss-function-name', 'Custom');

    expect(role).to.be('generated-role-name');
  });

  it('makeInvocationRole of cdn', async () => {
    const role = await trigger.makeInvocationRole('cdn-service_name', 'cdn-function_name', 'CDN');

    assert.calledOnce(ram.makeRole);
    assert.calledWith(ram.makeRole,
      'FunCreateRole-cdn-service-name-cdn-function-name',
      true,
      'Used for fc invocation',
      {
        Statement: [
          {
            'Action': 'sts:AssumeRole',
            'Effect': 'Allow',
            'Principal': {
              'Service': [
                'cdn.aliyuncs.com'
              ]
            }
          }
        ],
        Version: '1'
      });

    assert.calledWith(ram.makePolicy, 'FunCreateCDNPolicy-cdn-service-name-cdn-function-name',
      {
        Statement: [{
          'Action': [
            'fc:InvokeFunction'
          ],
          'Resource': `acs:fc:*:*:services/cdn-service_name/functions/*`,
          'Effect': 'Allow'
        }],
        Version: '1'
      });
    assert.calledOnce(ram.attachPolicyToRole);
    assert.calledWith(ram.attachPolicyToRole, 'FunCreateCDNPolicy-cdn-service-name-cdn-function-name', 'FunCreateRole-cdn-service-name-cdn-function-name', 'Custom');

    expect(role).to.be('generated-role-name');
  });
});

describe('cdn domain capitalization', () => {

  it('Domain->domain', async() => {
    var capitalConfig = trigger.getTriggerConfig('CDN', {
      'EventName': 'CachedObjectsRefreshed',
      'EventVersion': '1.0.0',
      'Notes': 'cdn events trigger test',
      'Filter': {
        'Domain': [
          'cdn-trigger.sunfeiyu.top'
        ]
      }
    });
    expect(capitalConfig).to.eql({
      'eventName': 'CachedObjectsRefreshed',
      'eventVersion': '1.0.0',
      'notes': 'cdn events trigger test',
      'filter': {
        'domain': [
          'cdn-trigger.sunfeiyu.top'
        ]
      }
    });
  });
});
