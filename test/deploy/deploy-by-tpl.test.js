'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const expect = require('expect.js');

const path = require('path');
const deploySupport = require('../../lib/deploy/deploy-support');

const ram = require('../../lib/ram');
const { setProcess } = require('../test-utils');
const { red } = require('colors');
const trigger = require('../../lib/trigger');
const fc = require('../../lib/fc');
const prompt = require('../../lib/init/prompt');

const { tpl, tplWithDuplicatedFunction } = require('../tpl-mock-data');

describe('deploy service role ', () => {
  let restoreProcess;

  beforeEach(() => {

    Object.keys(deploySupport).forEach(m => {
      sandbox.stub(deploySupport, m).resolves({});
    });

    Object.keys(fc).forEach(m => {
      sandbox.stub(fc, m).resolves({});
    });

    Object.keys(trigger).forEach(m => {
      if (m === 'getTriggerNameList') {
        sandbox.stub(trigger, m).resolves([]);
      } else {
        sandbox.stub(trigger, m).resolves({});
      }
    });

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

    restoreProcess = setProcess({
      ACCOUNT_ID: 'ACCOUNT_ID',
      DEFAULT_REGION: 'cn-shanghai',
      ACCESS_KEY_ID: 'ACCESS_KEY_ID',
      ACCESS_KEY_SECRET: 'ACCESS_KEY_SECRET'
    });
  });
  afterEach(() => {
    sandbox.restore();
    restoreProcess();
  });

  async function deploy(example) {
    await proxyquire('../../lib/deploy/deploy-by-tpl', {
      './deploy-support': deploySupport,
      '../ram': ram,
      '../fc': fc,
      '../trigger': trigger
    }).deploy(path.join('./examples', example, 'template.yml'), {});
  }

  it('all none', async () => {
    await deploy('datahub');
    assert.notCalled(ram.makeRole);
    assert.notCalled(ram.makePolicy);
    assert.notCalled(ram.makeAndAttachPolicy);
    assert.notCalled(ram.attachPolicyToRole);
  });

  it('police and vpc', async () => {
    await deploy('nas/read-write');
    assert.calledWith(ram.makeRole, '', true);
    assert.notCalled(ram.makePolicy);
    assert.notCalled(ram.makeAndAttachPolicy);
  });
  it('only log', async () => {
    await deploy('sls_trigger_demo');
    assert.calledWith(ram.makeRole, '', true);
    assert.calledWith(ram.attachPolicyToRole, 'AliyunFCInvocationAccess', 'AliyunFcGeneratedApiGatewayRole');
    assert.notCalled(ram.makePolicy);
  });

  it('only role', async () => {
    await deploy('service_role');
    assert.notCalled(ram.makeRole);
    assert.notCalled(ram.makeAndAttachPolicy);
    assert.notCalled(ram.attachPolicyToRole);
    assert.notCalled(ram.makePolicy);
  });
});

describe('deploy', () => {
  let restoreProcess;

  beforeEach(() => {

    sandbox.stub(console, 'warn');

    Object.keys(deploySupport).forEach(m => {
      sandbox.stub(deploySupport, m).resolves({});
    });

    Object.keys(fc).forEach(m => {
      sandbox.stub(fc, m).resolves({});
    });

    Object.keys(trigger).forEach(m => {
      if (m === 'getTriggerNameList') {
        sandbox.stub(trigger, m).resolves(['my_trigger_name']);
      } else {
        sandbox.stub(trigger, m).resolves({});
      }
    });

    Object.keys(ram).forEach(m => {
      if (m === 'makeRole') {
        sandbox.stub(ram, m).resolves({
          'Role': {
            'Arn': 'acs:ram::123:role/aliyunfcgeneratedrole-fc'
          }
        });
      } else {
        sandbox.stub(ram, m).resolves({});
      }
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

  async function deploy(example) {
    await proxyquire('../../lib/deploy/deploy-by-tpl', {
      './deploy-support': deploySupport,
      '../ram': ram,
      '../fc': fc,
      '../trigger': trigger
    }).deploy(path.join('./examples', example, 'template.yml'), {});
  }

  it('deploy local http trigger', async () => {
    await deploy('local_http');

    assert.calledWith(fc.makeService.firstCall, {
      description: 'local invoke demo',
      internetAccess: null,
      logConfig: {},
      nasConfig: undefined,
      role: '',
      serviceName: 'local-http-demo',
      vpcConfig: undefined
    });

    assert.calledWith(fc.makeFunction.firstCall,
      path.join(process.cwd(), 'examples', 'local_http'), {
        codeUri: 'nodejs8/',
        description: 'http trigger demo with nodejs8!',
        environmentVariables: undefined,
        functionName: 'nodejs8',
        handler: 'index.handler',
        initializationTimeout: undefined,
        initializer: 'index.initializer',
        memorySize: undefined,
        nasConfig: undefined,
        runtime: 'nodejs8',
        serviceName: 'local-http-demo',
        timeout: undefined
      });

    assert.calledWith(trigger.displayTriggerInfo.firstCall, 'local-http-demo', 'nodejs8', 'http-test', 'HTTP', {
      AuthType: 'ANONYMOUS',
      Methods: ['GET', 'POST', 'PUT']
    }, '\t\t');
  });

  it('deploy datahub', async () => {
    await deploy('datahub');

    assert.calledWith(fc.makeService, {
      description: undefined,
      internetAccess: null,
      logConfig: {},
      role: '',
      serviceName: 'MyService',
      vpcConfig: undefined,
      nasConfig: undefined
    });

    assert.calledWith(fc.makeFunction,
      path.join(process.cwd(), 'examples', 'datahub'), {
        codeUri: 'datahub.js',
        description: undefined,
        functionName: 'MyFunction',
        handler: 'datahub.index',
        initializer: undefined,
        memorySize: undefined,
        runtime: 'nodejs6',
        initializationTimeout: undefined,
        serviceName: 'MyService',
        timeout: undefined,
        environmentVariables: undefined,
        nasConfig: undefined
      });
  });

  it('deploy helloworld', async () => {
    await deploy('helloworld');

    assert.calledWith(fc.makeService, {
      description: 'fc test',
      internetAccess: null,
      logConfig: {},
      role: '',
      serviceName: 'fc',
      vpcConfig: undefined,
      nasConfig: undefined
    });
    assert.calledWith(fc.makeFunction,
      path.join(process.cwd(), 'examples', 'helloworld'), {
        codeUri: './',
        description: undefined,
        functionName: 'helloworld',
        handler: 'helloworld.index',
        initializer: undefined,
        memorySize: undefined,
        runtime: 'nodejs8',
        serviceName: 'fc',
        timeout: 60,
        initializationTimeout: undefined,
        environmentVariables: undefined,
        nasConfig: undefined
      });
  });

  it('deploy java', async () => {
    await deploy('java');

    assert.calledWith(fc.makeService, {
      description: 'java demo',
      internetAccess: null,
      logConfig: {},
      role: '',
      serviceName: 'java',
      vpcConfig: undefined,
      nasConfig: undefined
    });
    assert.calledWith(fc.makeFunction,
      path.join(process.cwd(), 'examples', 'java'), {
        codeUri: './demo.jar',
        description: 'Hello world!',
        functionName: 'helloworld',
        handler: 'example.App::handleRequest',
        initializer: undefined,
        memorySize: undefined,
        runtime: 'java8',
        serviceName: 'java',
        timeout: undefined,
        initializationTimeout: undefined,
        environmentVariables: undefined,
        nasConfig: undefined
      });

  });

  it('deploy nas', async () => {
    await deploy('nas/read-write');

    assert.calledWith(fc.makeService, {
      description: 'fc nas test',
      internetAccess: null,
      logConfig: {},
      role: 'acs:ram::123:role/aliyunfcgeneratedrole-fc',
      serviceName: 'nasDemo',
      vpcConfig: {
        SecurityGroupId: 'sg-bp1243pi65bw4cjj4bks',
        VSwitchIds: ['vsw-bp1gitru7oicyyb4uiylj'],
        VpcId: 'vpc-bp12hm92gdpcjtai7ua82'
      },
      nasConfig: {
        GroupId: -1,
        UserId: -1,
        MountPoints: [{
          MountDir: '/mnt/test',
          ServerAddr: '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/'
        }]
      }
    });

    assert.calledWith(fc.makeFunction.firstCall,
      path.join(process.cwd(), 'examples', 'nas', 'read-write'), {
        codeUri: './read.js',
        description: undefined,
        functionName: 'readNas',
        handler: 'read.handler',
        initializer: undefined,
        memorySize: undefined,
        runtime: 'nodejs8',
        serviceName: 'nasDemo',
        timeout: 100,
        initializationTimeout: undefined,
        environmentVariables: { ROOT_DIR: '/mnt/test' },
        nasConfig: {
          GroupId: -1,
          UserId: -1,
          MountPoints: [{
            MountDir: '/mnt/test',
            ServerAddr: '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/'
          }]
        }
      });

    assert.calledWith(fc.makeFunction.secondCall,
      path.join(process.cwd(), 'examples', 'nas', 'read-write'), {
        codeUri: './write.py',
        description: undefined,
        functionName: 'writeNas',
        handler: 'write.handler',
        initializer: undefined,
        memorySize: undefined,
        runtime: 'python2.7',
        serviceName: 'nasDemo',
        timeout: 100,
        initializationTimeout: undefined,
        environmentVariables: { ROOT_DIR: '/mnt/test' },
        nasConfig: {
          GroupId: -1,
          UserId: -1,
          MountPoints: [{
            MountDir: '/mnt/test',
            ServerAddr: '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/'
          }]
        }
      });
  });

  it('deploy openid_connect', async () => {
    await deploy('openid_connect');

    assert.calledWith(fc.makeService, {
      description: 'fc test',
      internetAccess: null,
      logConfig: {},
      role: '',
      serviceName: 'fc',
      vpcConfig: undefined,
      nasConfig: undefined
    });

    assert.calledWith(fc.makeFunction,
      path.join(process.cwd(), 'examples', 'openid_connect'), {
        codeUri: './',
        description: 'Hello world!',
        functionName: 'helloworld',
        handler: 'helloworld.index',
        initializer: undefined,
        memorySize: undefined,
        runtime: 'nodejs8',
        serviceName: 'fc',
        timeout: undefined,
        initializationTimeout: undefined,
        environmentVariables: undefined,
        nasConfig: undefined
      });
    assert.calledWith(deploySupport.makeGroup, {
      name: 'aliyunfcdemo2',
      description: 'api group for function compute'
    });
    assert.calledWith(deploySupport.makeApi, {}, {
      allowSignatureMethod: undefined,
      appCodeAuthType: undefined,
      disableInternet: undefined,
      errorCodeSamples: undefined,
      forceNonceCheck: undefined,
      webSocketApiType: undefined,
      apiName: 'connectid',
      auth: {
        config: {
          'idTokenParamName': 'token',
          'openIdApiType': 'BUSINESS'
        },
        type: 'APPOPENID'
      },
      description: undefined,
      functionName: 'helloworld',
      method: 'get',
      requestParameters: [{
        location: 'Path',
        apiParameterName: 'token',
        parameterType: 'String',
        required: 'REQUIRED'
      }],
      requestPath: '/getUserInfo/[token]',
      roleArn: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'fc',
      stageName: 'RELEASE',
      visibility: 'PRIVATE',
      serviceTimeout: 3000,
      serviceParameters: undefined,
      serviceParametersMap: undefined,
      resultConfig: { failResultSample: undefined, resultSample: undefined, resultType: undefined },
      requestConfig: {}
    });
  });

  it('deploy tablestore-trigger', async () => {
    await deploy('tablestore-trigger');

    assert.calledWith(fc.makeService, {
      description: 'Stream trigger for TableStore',
      internetAccess: null,
      logConfig: {},
      role: '',
      serviceName: 'test-tableStore-service',
      vpcConfig: undefined,
      nasConfig: undefined
    });
    assert.calledWith(fc.makeFunction,
      path.join(process.cwd(), 'examples', 'tablestore-trigger'), {
        codeUri: './',
        handler: 'main.index',
        initializer: undefined,
        description: undefined,
        functionName: 'fun-ots-func',
        memorySize: undefined,
        runtime: 'nodejs8',
        serviceName: 'test-tableStore-service',
        timeout: undefined,
        initializationTimeout: undefined,
        environmentVariables: undefined,
        nasConfig: undefined
      });
    assert.calledWith(trigger.makeTrigger, {
      serviceName: 'test-tableStore-service',
      functionName: 'fun-ots-func',
      triggerName: 'my-tablestore-trigger',
      triggerType: 'TableStore',
      triggerProperties: {
        InstanceName: 'fc-test-inst',
        TableName: 'fc_test_tbl'
      }
    });
  });

  it('deploy sls_demo', async () => {
    await deploy('sls_demo');

    assert.calledWith(fc.makeService, {
      description: 'sls test',
      internetAccess: null,
      logConfig: {},
      role: '',
      serviceName: 'log-compute',
      vpcConfig: undefined,
      nasConfig: undefined
    });
    assert.calledWith(fc.makeFunction,
      path.join(process.cwd(), 'examples', 'sls_demo'), {
        codeUri: './',
        handler: 'index.handler',
        initializer: undefined,
        description: undefined,
        functionName: 'log-compute',
        memorySize: undefined,
        runtime: 'python2.7',
        serviceName: 'log-compute',
        timeout: undefined,
        initializationTimeout: undefined,
        environmentVariables: undefined,
        nasConfig: undefined
      });
    assert.calledWith(trigger.makeTrigger, {
      serviceName: 'log-compute',
      functionName: 'log-compute',
      triggerName: 'log-stream',
      triggerType: 'Log',
      triggerProperties: {
        Enable: true,
        JobConfig: { MaxRetryTime: 1, TriggerInterval: 30 },
        LogConfig: { Logstore: 'log-en-m', Project: 'log-com-m' },
        SourceConfig: { Logstore: 'log-com-m' }
      }
    });
  });

  it('deploy rds-trigger', async () => {
    await deploy('rds-trigger');

    assert.calledWith(fc.makeService, {
      description: 'rds trigger test',
      internetAccess: null,
      logConfig: {},
      role: '',
      serviceName: 'rds-service',
      vpcConfig: undefined,
      nasConfig: undefined
    });
    assert.calledWith(fc.makeFunction,
      path.join(process.cwd(), 'examples', 'rds-trigger'), {
        codeUri: './',
        handler: 'index.handler',
        initializer: undefined,
        description: undefined,
        functionName: 'rds-function',
        memorySize: undefined,
        runtime: 'python2.7',
        serviceName: 'rds-service',
        timeout: undefined,
        initializationTimeout: undefined,
        environmentVariables: undefined,
        nasConfig: undefined
      });
    assert.calledWith(trigger.makeTrigger, {
      serviceName: 'rds-service',
      functionName: 'rds-function',
      triggerName: 'my-rds-trigger',
      triggerType: 'RDS',
      triggerProperties: {
        InstanceId: 'rm-12345799xyz',
        SubscriptionObjects: ['db1.table1'],
        Retry: 2,
        Concurrency: 1,
        EventFormat: 'json'
      }
    });
  });

  it('deploy oss-trigger', async () => {
    await deploy('oss-trigger');

    assert.calledWith(fc.makeService, {
      description: 'oss trigger test',
      internetAccess: null,
      logConfig: {},
      role: '',
      serviceName: 'oss-test-service',
      vpcConfig: undefined,
      nasConfig: undefined
    });
    assert.calledWith(fc.makeFunction,
      path.join(process.cwd(), 'examples', 'oss-trigger'), {
        codeUri: './',
        handler: 'index.handler',
        initializer: undefined,
        description: undefined,
        functionName: 'oss-test-function',
        memorySize: undefined,
        runtime: 'python2.7',
        serviceName: 'oss-test-service',
        timeout: undefined,
        initializationTimeout: undefined,
        environmentVariables: undefined,
        nasConfig: undefined
      });
    assert.calledWith(trigger.makeTrigger, {
      serviceName: 'oss-test-service',
      functionName: 'oss-test-function',
      triggerName: 'oss-trigger-name',
      triggerType: 'OSS',
      triggerProperties: {
        BucketName: 'coco-superme',
        Events: ['oss:ObjectCreated:*', 'oss:ObjectRemoved:DeleteObject'],
        Filter: { Key: { Prefix: 'source/', Suffix: '.png' } }
      }
    });
    assert.calledWith(trigger.getTriggerNameList, {
      serviceName: 'oss-test-service',
      functionName: 'oss-test-function'
    });
  });

  it('deploy cdn-trigger whith qualifier property', async () => {
    await deploy('cdn-trigger');

    assert.calledWith(fc.makeService, {
      description: 'cdn trigger test',
      internetAccess: null,
      logConfig: {},
      role: '',
      serviceName: 'cdn-test-service',
      vpcConfig: undefined,
      nasConfig: undefined
    });
    assert.calledWith(fc.makeFunction,
      path.join(process.cwd(), 'examples', 'cdn-trigger'), {
        codeUri: './',
        handler: 'index.handler',
        initializer: undefined,
        description: undefined,
        functionName: 'cdn-test-function',
        memorySize: undefined,
        runtime: 'nodejs8',
        serviceName: 'cdn-test-service',
        timeout: undefined,
        initializationTimeout: undefined,
        environmentVariables: undefined,
        nasConfig: undefined
      });
    assert.calledWith(trigger.makeTrigger, {
      serviceName: 'cdn-test-service',
      functionName: 'cdn-test-function',
      triggerName: 'cdn-trigger-name',
      triggerType: 'CDN',
      triggerProperties: {
        'EventName': 'CachedObjectsRefreshed',
        'EventVersion': '1.0.0',
        'Notes': 'cdn events trigger test',
        'Filter': {
          'Domain': [
            'cdn-trigger.sunfeiyu.top'
          ]
        },
        'Qualifier': '1'
      }
    });
    assert.calledWith(trigger.getTriggerNameList, {
      serviceName: 'cdn-test-service',
      functionName: 'cdn-test-function'
    });
  });

  it('deploy mnsTopic-trigger', async () => {
    await deploy('mnsTopic-trigger');

    assert.calledWith(fc.makeService, {
      description: 'MnsTopic trigger test',
      internetAccess: null,
      logConfig: {},
      role: '',
      serviceName: 'mnsTopic-service',
      vpcConfig: undefined,
      nasConfig: undefined
    });
    assert.calledWith(fc.makeFunction,
      path.join(process.cwd(), 'examples', 'mnsTopic-trigger'), {
        codeUri: './',
        handler: 'index.handler',
        initializer: undefined,
        description: undefined,
        functionName: 'mnsTopic-function',
        memorySize: undefined,
        runtime: 'python2.7',
        serviceName: 'mnsTopic-service',
        timeout: undefined,
        initializationTimeout: undefined,
        environmentVariables: undefined,
        nasConfig: undefined
      });
    assert.calledWith(trigger.makeTrigger, {
      serviceName: 'mnsTopic-service',
      functionName: 'mnsTopic-function',
      triggerName: 'my-mns-trigger',
      triggerType: 'MNSTopic',
      triggerProperties: {
        TopicName: 'test-topic',
        NotifyContentFormat: 'JSON',
        NotifyStrategy: 'EXPONENTIAL_DECAY_RETRY',
        FilterTag: 'testTag'
      }
    });
  });

  it('deploy python', async () => {
    await deploy('python');

    assert.calledWith(fc.makeService, {
      description: 'python demo',
      internetAccess: null,
      logConfig: {},
      role: '',
      serviceName: 'pythondemo',
      vpcConfig: undefined,
      nasConfig: undefined
    });
    assert.calledWith(fc.makeFunction,
      path.join(process.cwd(), 'examples', 'python'), {
        codeUri: './',
        description: 'Hello world with python!',
        functionName: 'hello',
        handler: 'main.hello',
        initializer: undefined,
        memorySize: undefined,
        runtime: 'python2.7',
        serviceName: 'pythondemo',
        timeout: undefined,
        initializationTimeout: undefined,
        environmentVariables: undefined,
        nasConfig: undefined
      });
    assert.calledWith(deploySupport.makeGroup, {
      description: 'api group for function compute',
      name: 'apigw_fc'
    });
    assert.calledWith(deploySupport.makeApi, {}, {
      allowSignatureMethod: 'HmacSHA256',
      appCodeAuthType: 'HEADER_QUERY',
      disableInternet: true,
      errorCodeSamples: [
        {
          code: 400, description: 'error description', message: 'error' 
        }, 
        {
          code: 300, description: 'error description', message: 'error'
        }
      ],      
      forceNonceCheck: false,
      webSocketApiType: 'REGISTER',
      apiName: 'pythonhello',
      auth: {
        config: { idTokenParamName: 'token', openIdApiType: 'BUSINESS' },
        type: 'APPOPENID'
      },
      description: undefined,
      functionName: 'hello',
      method: 'get',
      requestParameters: [{
        apiParameterName: 'token',
        location: 'Path',
        parameterType: 'String',
        required: 'REQUIRED'
      }],
      requestPath: '/python/hello',
      roleArn: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'pythondemo',
      stageName: 'RELEASE',
      visibility: undefined,
      serviceTimeout: 3000,
      requestConfig: {},
      serviceParameters: undefined,
      serviceParametersMap: undefined,
      resultConfig: { failResultSample: undefined, resultSample: undefined, resultType: undefined }
    });
  });
  it('deploy segment', async () => {
    await deploy('segment');

    assert.calledWith(fc.makeService, {
      description: 'Module as a service',
      internetAccess: null,
      logConfig: {},
      role: '',
      serviceName: 'maas',
      vpcConfig: undefined,
      nasConfig: undefined
    });

    assert.calledWith(fc.makeFunction,
      path.join(process.cwd(), 'examples', 'segment'), {
        codeUri: './',
        description: 'do segment',
        functionName: 'doSegment',
        handler: 'index.doSegment',
        initializer: undefined,
        memorySize: undefined,
        runtime: 'nodejs8',
        serviceName: 'maas',
        timeout: undefined,
        initializationTimeout: undefined,
        environmentVariables: undefined,
        nasConfig: undefined
      });

    assert.calledWith(deploySupport.makeGroup, {
      description: 'api group for function compute',
      name: 'maasapi'
    });
    assert.calledWith(deploySupport.makeApi, {}, {
      allowSignatureMethod: undefined,
      appCodeAuthType: undefined,
      disableInternet: undefined,
      errorCodeSamples: undefined,
      forceNonceCheck: undefined,
      webSocketApiType: undefined,
      description: undefined,
      apiName: 'segment_post',
      auth: { config: undefined, type: undefined },
      functionName: 'doSegment',
      method: 'post',
      requestParameters: undefined,
      requestPath: '/do_segment',
      roleArn: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'maas',
      stageName: 'RELEASE',
      visibility: undefined,
      resultConfig: { failResultSample: undefined, resultSample: undefined, resultType: undefined },
      serviceParameters: undefined,
      serviceParametersMap: undefined,
      serviceTimeout: 3000,
      requestConfig: { requestMode: 'PASSTHROUGH', requestProtocol: 'http' }
    });
  });
  it('deploy timer', async () => {
    await deploy('timer');

    assert.calledWith(fc.makeService, {
      description: undefined,
      internetAccess: null,
      logConfig: {},
      role: '',
      serviceName: 'MyService',
      vpcConfig: undefined,
      nasConfig: undefined
    });
    assert.calledWith(fc.makeFunction,
      path.join(process.cwd(), 'examples', 'timer'), {
        codeUri: './',
        description: 'send hangzhou weather',
        functionName: 'MyFunction',
        handler: 'index.handler',
        initializer: undefined,
        memorySize: undefined,
        runtime: 'nodejs8',
        serviceName: 'MyService',
        timeout: undefined,
        initializationTimeout: undefined,
        environmentVariables: undefined,
        nasConfig: undefined
      });
    assert.calledWith(trigger.makeTrigger, {
      functionName: 'MyFunction',
      serviceName: 'MyService',
      triggerName: 'TmTrigger',
      triggerProperties: {
        CronExpression: '0 0 8 * * *',
        Enable: true,
        Payload: 'awesome-fc'
      },
      triggerType: 'Timer'
    });
  });
  it('deploy wechat', async () => {
    await deploy('wechat');

    assert.calledWith(fc.makeService, {
      description: 'wechat demo',
      internetAccess: null,
      logConfig: {},
      role: '',
      serviceName: 'wechat',
      vpcConfig: undefined,
      nasConfig: undefined
    });
    assert.calledWith(fc.makeFunction.firstCall,
      path.join(process.cwd(), 'examples', 'wechat'), {
        codeUri: './',
        description: 'Wechat get handler',
        functionName: 'get',
        handler: 'wechat.get',
        initializer: undefined,
        memorySize: undefined,
        runtime: 'nodejs6',
        serviceName: 'wechat',
        timeout: undefined,
        initializationTimeout: undefined,
        environmentVariables: undefined,
        nasConfig: undefined
      });
    assert.alwaysCalledWith(deploySupport.makeGroup, {
      description: 'api group for function compute',
      name: 'wechat_group'
    });
    assert.calledWith(deploySupport.makeApi.firstCall, {}, {
      allowSignatureMethod: undefined,
      appCodeAuthType: undefined,
      disableInternet: undefined,
      errorCodeSamples: undefined,
      forceNonceCheck: undefined,
      webSocketApiType: undefined,
      apiName: 'wechat_get',
      auth: { config: undefined, type: undefined },
      functionName: 'get',
      method: 'get',
      description: undefined,
      requestParameters: [
        { apiParameterName: 'encrypt_type' },
        { apiParameterName: 'msg_signature' },
        { location: 'Query', apiParameterName: 'timestamp', required: 'REQUIRED', parameterType: 'String' },
        { location: 'Query', apiParameterName: 'nonce', parameterType: 'String' },
        { location: 'Query', apiParameterName: 'signature', parameterType: 'String' },
        { location: 'Query', apiParameterName: 'echostr', parameterType: 'String' }
      ],
      requestPath: '/wechat',
      roleArn: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'wechat',
      stageName: 'RELEASE',
      serviceParameters: undefined,
      serviceParametersMap: undefined,
      visibility: undefined,
      requestConfig: { bodyFormat: 'STREAM', requestMode: 'MAPPING', requestProtocol: 'HTTP' },
      resultConfig: { failResultSample: undefined, resultSample: undefined, resultType: undefined },
      serviceTimeout: 3000
    });

    assert.calledWith(fc.makeFunction.secondCall,
      path.join(process.cwd(), 'examples', 'wechat'), {
        codeUri: './',
        description: 'Wechat post handler',
        functionName: 'post',
        handler: 'wechat.post',
        initializer: undefined,
        memorySize: undefined,
        runtime: 'nodejs6',
        serviceName: 'wechat',
        timeout: undefined,
        initializationTimeout: undefined,
        environmentVariables: undefined,
        nasConfig: undefined
      });
    assert.calledWith(deploySupport.makeApi.secondCall, {}, {
      allowSignatureMethod: undefined,
      appCodeAuthType: undefined,
      disableInternet: undefined,
      errorCodeSamples: undefined,
      forceNonceCheck: undefined,
      webSocketApiType: undefined,
      apiName: 'wechat_post',
      auth: { config: undefined, type: undefined },
      functionName: 'post',
      method: 'post',
      description: undefined,
      requestParameters: [
        { location: 'Query', apiParameterName: 'timestamp', required: 'REQUIRED', parameterType: 'String' },
        { location: 'Query', apiParameterName: 'nonce', parameterType: 'String' },
        { location: 'Query', apiParameterName: 'signature', parameterType: 'String' },
        { location: 'Query', apiParameterName: 'msg_signature', parameterType: 'String' },
        { location: 'Query', apiParameterName: 'encrypt_type', parameterType: 'String' }
      ],
      requestPath: '/wechat',
      roleArn: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'wechat',
      stageName: 'RELEASE',
      visibility: undefined,
      serviceParameters: undefined,
      serviceParametersMap: undefined,
      requestConfig: { bodyFormat: 'STREAM', requestMode: 'MAPPING', requestProtocol: 'HTTP' },
      resultConfig: { failResultSample: undefined, resultSample: undefined, resultType: undefined },
      serviceTimeout: 3000
    });
  });

  it('deploy custom_domain', async () => {
    await deploy('custom_domain');

    assert.calledWith(deploySupport.makeCustomDomain, {
      domainName: 'fun.cn-shanghai.1221968287646227.cname-test.fc.aliyun-inc.com',
      protocol: 'HTTP',
      routeConfig: {
        routes: [{
          path: '/a',
          serviceName: 'serviceA',
          functionName: 'functionA'
        },
        {
          path: '/b',
          serviceName: 'serviceB',
          functionName: 'functionB'
        }
        ]
      },
      certConfig: {}
    });
  });

  it('deploy initializer', async () => {
    await deploy('initializer');

    assert.calledWith(fc.makeService, {
      description: 'initializer demo',
      internetAccess: null,
      logConfig: {},
      role: '',
      serviceName: 'initializerdemo',
      vpcConfig: undefined,
      nasConfig: undefined
    });
    assert.calledWith(fc.makeFunction,
      path.join(process.cwd(), 'examples', 'initializer'), {
        codeUri: './',
        description: 'Hello world with initializer!',
        environmentVariables: undefined,
        functionName: 'initializer',
        handler: 'main.my_handler',
        initializationTimeout: undefined,
        initializer: 'main.my_initializer',
        memorySize: undefined,
        runtime: 'python2.7',
        serviceName: 'initializerdemo',
        timeout: undefined,
        nasConfig: undefined
      });
    assert.calledWith(deploySupport.makeGroup, {
      description: 'api group for function compute',
      name: 'apigw_fc'
    });
    assert.calledWith(deploySupport.makeApi, {}, {
      allowSignatureMethod: undefined,
      appCodeAuthType: undefined,
      disableInternet: undefined,
      errorCodeSamples: undefined,
      forceNonceCheck: undefined,
      webSocketApiType: undefined,
      apiName: 'initialize',
      auth: {
        config: undefined,
        type: undefined
      },
      description: undefined,
      functionName: 'initializer',
      method: 'get',
      requestParameters: undefined,
      requestPath: '/python/initializer',
      roleArn: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'initializerdemo',
      stageName: 'RELEASE',
      visibility: undefined,
      serviceTimeout: 3000,
      requestConfig: {},
      serviceParameters: undefined,
      serviceParametersMap: undefined,
      resultConfig: { failResultSample: undefined, resultSample: undefined, resultType: undefined }
    });
  });

  it('deploy service role', async () => {
    await deploy('service_role');

    assert.calledWith(fc.makeService, {
      description: 'local invoke demo',
      internetAccess: null,
      logConfig: {},
      role: 'acs:ram::123:role/aliyunfcgeneratedrole-fc',
      serviceName: 'localdemo',
      vpcConfig: undefined,
      nasConfig: undefined
    });

    assert.calledWith(fc.makeFunction,
      path.join(process.cwd(), 'examples', 'service_role'), {
        codeUri: 'nodejs6',
        description: 'Hello world with nodejs6!',
        functionName: 'nodejs6',
        handler: 'index.handler',
        initializer: undefined,
        memorySize: undefined,
        runtime: 'nodejs6',
        initializationTimeout: undefined,
        serviceName: 'localdemo',
        timeout: undefined,
        environmentVariables: { StringTypeValue1: 123, StringTypeValue2: 'test' },
        nasConfig: undefined
      });
    // add test => no events on local but have onLine 
    assert.notCalled(trigger.makeTrigger);
    assert.calledOnce(console.warn);
    assert.calledWith(console.warn, red(`\t\tThe trigger my_trigger_name you configured in fc console does not match the local configuration.\n\t\tFun will not modify this trigger. You can remove this trigger manually through fc console if necessary`));
  });
});

describe('custom domain', () => {
  let restoreProcess;

  beforeEach(() => {
    Object.keys(deploySupport).forEach(m => {
      sandbox.stub(deploySupport, m);
    });

    restoreProcess = setProcess({
      ACCOUNT_ID: 'ACCOUNT_ID',
      DEFAULT_REGION: 'cn-shanghai',
      ACCESS_KEY_ID: 'ACCESS_KEY_ID',
      ACCESS_KEY_SECRET: 'ACCESS_KEY_SECRET'
    });
  });

  afterEach(() => {
    sandbox.restore();
    restoreProcess();
  });

  async function customDomain(domainName, domainDefinition) {
    await proxyquire('../../lib/deploy/deploy-by-tpl', {
      './deploy-support': deploySupport
    }).deployCustomDomain(domainName, domainDefinition);
  }

  it('add qualifier field test', async () => {
    await customDomain('domainName', {
      'Type': 'Aliyun::Serverless::CustomDomain',
      'Properties': {
        'Protocol': 'HTTP',
        'RouteConfig': {
          'Routes': {
            '/a': {
              'serviceName': 'serviceA',
              'functionName': 'functionA',
              'Qualifier': 'Prod'
            },
            '/b': {
              'serviceName': 'serviceB',
              'functionName': 'functionB'
            }
          }
        }
      }
    });
    assert.calledWith(deploySupport.makeCustomDomain, {
      domainName: 'domainName',
      protocol: 'HTTP',
      routeConfig: {
        routes: [{
          path: '/a',
          serviceName: 'serviceA',
          functionName: 'functionA',
          qualifier: 'Prod'
        },
        {
          path: '/b',
          serviceName: 'serviceB',
          functionName: 'functionB'
        }]
      },
      certConfig: {}
    });
  });

  it('lowercase custom domain', async () => {
    await customDomain('domainName', {
      'Type': 'Aliyun::Serverless::CustomDomain',
      'Properties': {
        'Protocol': 'HTTP',
        'RouteConfig': {
          'Routes': {
            '/a': {
              'serviceName': 'serviceA',
              'functionName': 'functionA'
            },
            '/b': {
              'serviceName': 'serviceB',
              'functionName': 'functionB'
            }
          }
        }
      }
    });
    assert.calledWith(deploySupport.makeCustomDomain, {
      domainName: 'domainName',
      protocol: 'HTTP',
      routeConfig: {
        routes: [{
          path: '/a',
          serviceName: 'serviceA',
          functionName: 'functionA'
        },
        {
          path: '/b',
          serviceName: 'serviceB',
          functionName: 'functionB'
        }]
      },
      certConfig: {}
    });
  });
  it('capital custom domain', async () => {
    await customDomain('domainName', {
      'Type': 'Aliyun::Serverless::CustomDomain',
      'Properties': {
        'Protocol': 'HTTP',
        'RouteConfig': {
          'Routes': {
            '/a': {
              'ServiceName': 'serviceA',
              'FunctionName': 'functionA'
            },
            '/b': {
              'ServiceName': 'serviceB',
              'FunctionName': 'functionB'
            }
          }
        }
      }
    });
    assert.calledWith(deploySupport.makeCustomDomain, {
      domainName: 'domainName',
      protocol: 'HTTP',
      routeConfig: {
        routes: [{
          path: '/a',
          serviceName: 'serviceA',
          functionName: 'functionA'
        },
        {
          path: '/b',
          serviceName: 'serviceB',
          functionName: 'functionB'
        }]
      },
      certConfig: {}
    });
  });
  it('https custom domain', async () => {
    await customDomain('domainName', {
      'Type': 'Aliyun::Serverless::CustomDomain',
      'Properties': {
        'Protocol': 'HTTP,HTTPS',
        'RouteConfig': {
          'Routes': {
            '/a': {
              'ServiceName': 'serviceA',
              'FunctionName': 'functionA'
            },
            '/b': {
              'ServiceName': 'serviceB',
              'FunctionName': 'functionB'
            }
          }
        },
        'CertConfig': {
          'CertName': 'CertName',
          'PrivateKey': 'PrivateKey',
          'Certificate': 'Certificate'
        }
      }
    });
    assert.calledWith(deploySupport.makeCustomDomain, {
      domainName: 'domainName',
      protocol: 'HTTP,HTTPS',
      routeConfig: {
        routes: [{
          path: '/a',
          serviceName: 'serviceA',
          functionName: 'functionA'
        },
        {
          path: '/b',
          serviceName: 'serviceB',
          functionName: 'functionB'
        }]
      },
      certConfig: {
        CertName: 'CertName',
        PrivateKey: 'PrivateKey',
        Certificate: 'Certificate'
      }
    });
  });
});



describe('test partical deploy', () => {
  
  beforeEach(() => {

    Object.keys(prompt).forEach(m => {
      if (m === 'promptForSameFunction') {
        sandbox.stub(prompt, m).resolves({
          serviceName: 'localdemo',
          functionName: 'python3'
        });
      } else {
        sandbox.stub(prompt, m).resolves({});
      }
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  async function partialDeployment(sourceName, tpl) {
    return await proxyquire('../../lib/deploy/deploy-by-tpl', {
      '../../lib/init/prompt': prompt
    }).partialDeployment({
      resourceName: sourceName
    }, tpl);
  }

  it('single functionName', async () => {

    const {serviceName, serviceRes} = await partialDeployment('python3', tpl);

    expect(serviceName).to.be('localdemo');
    expect(serviceRes).to.be(tpl.Resources.localdemo);
  });

  it('serviceName/functionName', async () => {

    const {serviceName, serviceRes} = await partialDeployment('localdemo/python3', tpl);
    
    expect(serviceName).to.be('localdemo');
    expect(serviceRes).to.be(tpl.Resources.localdemo);
  });

  it('more than one function', async () => {

    const {serviceName, serviceRes} = await partialDeployment('localdemo/python3', tplWithDuplicatedFunction);
    
    expect(serviceName).to.be('localdemo');
    expect(serviceRes).to.be(tplWithDuplicatedFunction.Resources.localdemo);
  });
});