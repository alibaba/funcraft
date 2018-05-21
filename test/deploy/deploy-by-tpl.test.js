'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const deploySupport = require('../../lib/deploy/deploy-support');

describe('deploy', () => {
  beforeEach(() => {
    Object.keys(deploySupport).forEach(m =>
      sandbox.stub(deploySupport, m).resolves({})
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  async function deploy(example) {
    await proxyquire('../../lib/deploy/deploy-by-tpl', {
      './deploy-support': deploySupport
    })(`./examples/${example}/template.yml`);
  }

  it('deploy datahub', async () => {
    await deploy('datahub');

    assert.calledWith(deploySupport.makeService, 'MyService', undefined);
    assert.calledWith(deploySupport.makeFunction, {
      codeUri: './',
      description: undefined,
      functionName: 'MyFunction',
      handler: 'datahub.index',
      memorySize: undefined,
      runtime: 'nodejs6',
      serviceName: 'MyService',
      timeout: undefined
    });

  });

  it('deploy helloworld', async () => {
    await deploy('helloworld');

    assert.calledWith(deploySupport.makeService, 'fc', 'fc test');
    assert.calledWith(deploySupport.makeFunction, {
      codeUri: './',
      description: undefined,
      functionName: 'helloworld',
      handler: 'helloworld.index',
      memorySize: undefined,
      runtime: 'nodejs8',
      serviceName: 'fc',
      timeout: undefined
    });
    assert.calledWith(deploySupport.makeApiTrigger, {
      serviceName: 'fc',
      functionName: 'helloworld',
      triggerName: 'GetResource',
      method: 'GET',
      requestPath: '/helloworld',
      restApiId: undefined
    });
  });

  it('deploy java', async () => {
    await deploy('java');

    assert.calledWith(deploySupport.makeService, 'java', 'java demo');
    assert.calledWith(deploySupport.makeFunction, {
      codeUri: './demo.jar',
      description: 'Hello world!',
      functionName: 'helloworld',
      handler: 'example.App::handleRequest',
      memorySize: undefined,
      runtime: 'java8',
      serviceName: 'java',
      timeout: undefined
    });

  });

  it('deploy openid_connect', async () => {
    await deploy('openid_connect');

    assert.calledWith(deploySupport.makeService, 'fc', 'fc test');
    assert.calledWith(deploySupport.makeFunction, {
      codeUri: './',
      description: 'Hello world!',
      functionName: 'helloworld',
      handler: 'helloworld.index',
      memorySize: undefined,
      runtime: undefined,
      serviceName: 'fc',
      timeout: undefined
    });
    assert.calledWith(deploySupport.makeApiTrigger, {
      serviceName: 'fc',
      functionName: 'helloworld',
      triggerName: 'GetApi',
      method: 'GET',
      requestPath: '/getUserInfo/[token]',
      restApiId: { Ref: 'aliyunfcdemo2' }
    });
    assert.calledWith(deploySupport.makeGroup, {
      name: 'aliyunfcdemo2',
      description: 'api group for function compute'
    });
    assert.calledWith(deploySupport.makeRole, 'aliyunapigatewayaccessingfcrole');
    assert.calledWith(deploySupport.makeApi, {}, {
      apiName: 'getUserInfo_token_get',
      auth: {
        config: {
          'id-token-param-name': 'token',
          'openid-api-type': 'BUSINESS'
        },
        type: 'OPENID'
      },
      bodyFormat: '',
      functionName: 'helloworld',
      method: 'get',
      parameters: [
        {
          location: 'Path',
          name: 'token',
          requeired: 'REQUIRED',
          type: 'String'
        }
      ],
      requestPath: '/getUserInfo/[token]',
      role: {},
      serviceName: 'fc',
      stageName: 'RELEASE',
      visibility: 'PRIVATE'
    });
  });

  it('deploy ots_stream', async () => {
    await deploy('ots_stream');

    assert.calledWith(deploySupport.makeService, 'otsstream', 'Stream trigger for OTS');
    assert.calledWith(deploySupport.makeFunction, {
      codeUri: './',
      description: undefined,
      functionName: 'processor',
      handler: 'main.index',
      memorySize: undefined,
      runtime: 'nodejs8',
      serviceName: 'otsstream',
      timeout: undefined
    });
    assert.calledWith(deploySupport.makeOtsTrigger, {
      functionName: 'processor',
      serviceName: 'otsstream',
      stream: 'acs:ots:::instance/fc-test1/table/mytable1',
      triggerName: 'OtsTrigger'
    });
    assert.calledWith(deploySupport.makeOtsTable, {
      instanceName: 'fc-test1',
      primaryKeys: [
        {
          name: 'uid',
          type: 'STRING'
        }
      ],
      tableName: 'mytable1'
    });
  });

  it('deploy python', async () => {
    await deploy('python');

    assert.calledWith(deploySupport.makeService, 'pythondemo', 'python demo');
    assert.calledWith(deploySupport.makeFunction, {
      codeUri: './',
      description: 'Hello world with python!',
      functionName: 'hello',
      handler: 'main.hello',
      memorySize: undefined,
      runtime: 'python2.7',
      serviceName: 'pythondemo',
      timeout: undefined
    });
    assert.calledWith(deploySupport.makeApiTrigger, {
      functionName: 'hello',
      method: 'GET',
      requestPath: '/python/hello',
      restApiId: { Ref: 'apigw_fc' },
      serviceName: 'pythondemo',
      triggerName: 'GetApi'
    });
    assert.calledWith(deploySupport.makeGroup, {
      description: 'api group for function compute',
      name: 'apigw_fc'
    });
    assert.calledWith(deploySupport.makeRole, 'aliyunapigatewayaccessingfcrole');
    assert.calledWith(deploySupport.makeApi, {}, {
      apiName: 'pythonhello',
      auth: {
        config: undefined,
        type: undefined
      },
      bodyFormat: '',
      functionName: 'hello',
      method: 'get',
      parameters: undefined,
      requestPath: '/python/hello',
      role: {},
      serviceName: 'pythondemo',
      stageName: 'RELEASE',
      visibility: undefined
    });
  });
  it('deploy segment', async () => {
    await deploy('segment');

    assert.calledWith(deploySupport.makeService, 'maas', 'Module as a service');
    assert.calledWith(deploySupport.makeFunction, {
      codeUri: './',
      description: 'do segment',
      functionName: 'doSegment',
      handler: 'index.doSegment',
      memorySize: undefined,
      runtime: 'nodejs8',
      serviceName: 'maas',
      timeout: undefined
    });
    assert.calledWith(deploySupport.makeApiTrigger, {
      functionName: 'doSegment',
      method: 'GET',
      requestPath: '/do_segment',
      restApiId: { Ref: 'maasapi' },
      serviceName: 'maas',
      triggerName: 'GetApi'
    });
    assert.calledWith(deploySupport.makeGroup, {
      description: 'api group for function compute',
      name: 'maasapi'
    });
    assert.calledWith(deploySupport.makeRole, 'aliyunapigatewayaccessingfcrole');
    assert.calledWith(deploySupport.makeApi, {}, {
      apiName: 'segment_post',
      auth: { config: undefined, type: undefined },
      bodyFormat: 'STREAM',
      functionName: 'doSegment',
      method: 'post',
      parameters: undefined,
      requestPath: '/do_segment',
      role: {},
      serviceName: 'mass',
      stageName: 'RELEASE',
      visibility: undefined
    });
  });
  it('deploy timer', async () => {
    await deploy('timer');

    assert.calledWith(deploySupport.makeService, 'MyService', undefined);
    assert.calledWith(deploySupport.makeFunction, {
      codeUri: './',
      description: 'send hangzhou weather',
      functionName: 'MyFunction',
      handler: 'index.handler',
      memorySize: undefined,
      runtime: 'nodejs8',
      serviceName: 'MyService',
      timeout: undefined
    });
    assert.calledWith(deploySupport.makeTrigger, {
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

    assert.calledWith(deploySupport.makeService, 'wechat', 'wechat demo');
    assert.calledWith(deploySupport.makeFunction.firstCall, {
      codeUri: './',
      description: 'Wechat get handler',
      functionName: 'get',
      handler: 'wechat.get',
      memorySize: undefined,
      runtime: 'nodejs6',
      serviceName: 'wechat',
      timeout: undefined
    });
    assert.calledWith(deploySupport.makeApiTrigger.firstCall, {
      functionName: 'get',
      method: 'GET',
      requestPath: '/wechat',
      restApiId: { Ref: 'wechat_group' },
      serviceName: 'wechat',
      triggerName: 'GetApi'
    });
    assert.alwaysCalledWith(deploySupport.makeGroup, {
      description: 'api group for function compute',
      name: 'wechat_group'
    });
    assert.alwaysCalledWith(deploySupport.makeRole, 'aliyunapigatewayaccessingfcrole');
    assert.calledWith(deploySupport.makeApi.firstCall, {}, {
      apiName: 'wechat_get',
      auth: { config: undefined, type: undefined },
      bodyFormat: '',
      functionName: 'get',
      method: 'get',
      parameters: [
        { name: 'encrypt_type' },
        { name: 'msg_signature' },
        { location: 'Query', name: 'timestamp', required: 'REQUIRED', type: 'String' },
        { location: 'Query', name: 'nonce', type: 'String' },
        { location: 'Query', name: 'signature', type: 'String' },
        { location: 'Query', name: 'echostr', type: 'String' }
      ],
      requestPath: '/wechat',
      role: {},
      serviceName: 'wechat',
      stageName: 'RELEASE',
      visibility: undefined
    });

    assert.calledWith(deploySupport.makeFunction.secondCall, {
      codeUri: './',
      description: 'Wechat post handler',
      functionName: 'post',
      handler: 'wechat.post',
      memorySize: undefined,
      runtime: 'nodejs6',
      serviceName: 'wechat',
      timeout: undefined
    });
    assert.calledWith(deploySupport.makeApiTrigger.secondCall, {
      functionName: 'post',
      method: 'POST',
      requestPath: '/wechat',
      restApiId: { Ref: 'wechat_group' },
      serviceName: 'wechat',
      triggerName: 'GetApi'
    });
    assert.calledWith(deploySupport.makeApi.secondCall, {}, {
      apiName: 'wechat_post',
      auth: { config: undefined, type: undefined },
      bodyFormat: 'STREAM',
      functionName: 'post',
      method: 'post',
      parameters: [
        { location: 'Query', name: 'timestamp', required: 'REQUIRED', type: 'String' }, 
        { location: 'Query', name: 'nonce', type: 'String' }, 
        { location: 'Query', name: 'signature', type: 'String' }, 
        { location: 'Query', name: 'msg_signature', type: 'String' }, 
        { location: 'Query', name: 'encrypt_type', type: 'String' }
      ],
      requestPath: '/wechat',
      role: {  },
      serviceName: 'wechat',
      stageName: 'RELEASE',
      visibility: undefined
    });
  });
});