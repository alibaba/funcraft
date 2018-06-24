'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const deploySupport = require('../../lib/deploy/deploy-support');

const getProfile = require('../../lib/profile').getProfile;

describe('deploy', () => {
  beforeEach(() => {
    Object.keys(deploySupport).forEach(m => {
      console.log('method: ' + m);
      sandbox.stub(deploySupport, m).resolves({});
    }
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

    const profile = await getProfile();

    assert.calledWith(deploySupport.makeService, {
      description: undefined,
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::${profile.accountId}:role/aliyunfcgeneratedrole-myservice`,
      serviceName: 'MyService',
      vpcConfig: undefined
    });
  
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

    const profile = await getProfile();

    assert.calledWith(deploySupport.makeService, {
      description: 'fc test',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::${profile.accountId}:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'fc',
      vpcConfig: undefined
    });
    assert.calledWith(deploySupport.makeFunction, {
      codeUri: './',
      description: undefined,
      functionName: 'helloworld',
      handler: 'helloworld.index',
      memorySize: undefined,
      runtime: 'nodejs8',
      serviceName: 'fc',
      timeout: 60
    });
  });

  it('deploy java', async () => {
    await deploy('java');

    const profile = await getProfile();

    assert.calledWith(deploySupport.makeService, {
      description: 'java demo',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::${profile.accountId}:role/aliyunfcgeneratedrole-java`,
      serviceName: 'java',
      vpcConfig: undefined
    });
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

    const profile = await getProfile();

    assert.calledWith(deploySupport.makeService, {
      description: 'fc test',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::${profile.accountId}:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'fc',
      vpcConfig: undefined
    });

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
    assert.calledWith(deploySupport.makeGroup, {
      name: 'aliyunfcdemo2',
      description: 'api group for function compute'
    });
    assert.calledWith(deploySupport.makeApi, {}, {
      apiName: 'getUserInfo_token_get',
      auth: {
        config: {
          'idTokenParamName': 'token',
          'openidApiType': 'BUSINESS'
        },
        type: 'OPENID'
      },
      functionName: 'helloworld',
      method: 'get',
      parameters: [
        {
          location: 'Path',
          apiParameterName: 'token',
          parameterType: 'REQUIRED',
          type: 'String'
        }
      ],
      requestPath: '/getUserInfo/[token]',
      roleArn: `acs:ram::${profile.accountId}:role/aliyunapigatewayaccessingfcrole`,
      serviceName: 'fc',
      stageName: 'RELEASE',
      visibility: 'PRIVATE',
      serviceTimeout: 3000,
      resultConfig: {  },
      requestConfig: {  },
    });
  });

  it('deploy ots_stream', async () => {
    await deploy('ots_stream');

    const profile = await getProfile();

    assert.calledWith(deploySupport.makeService, {
      description: 'Stream trigger for OTS',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::${profile.accountId}:role/aliyunfcgeneratedrole-otsstream`,
      serviceName: 'otsstream',
      vpcConfig: undefined
    });
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
    assert.calledWith(deploySupport.makeOtsTable, {
      instanceName: 'fun-test',
      primaryKeys: [
        {
          name: 'uid',
          type: 'STRING'
        }
      ],
      tableName: 'mytable'
    });
  });

  it('deploy python', async () => {
    await deploy('python');

    const profile = await getProfile();

    assert.calledWith(deploySupport.makeService, {
      description: 'python demo',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::${profile.accountId}:role/aliyunfcgeneratedrole-pythondemo`,
      serviceName: 'pythondemo',
      vpcConfig: undefined
    });
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
    assert.calledWith(deploySupport.makeGroup, {
      description: 'api group for function compute',
      name: 'apigw_fc'
    });
    assert.calledWith(deploySupport.makeApi, {}, {
      apiName: 'pythonhello',
      auth: {
        config: undefined,
        type: undefined
      },
      functionName: 'hello',
      method: 'get',
      parameters: undefined,
      requestPath: '/python/hello',
      roleArn: `acs:ram::${profile.accountId}:role/aliyunapigatewayaccessingfcrole`,
      serviceName: 'pythondemo',
      stageName: 'RELEASE',
      visibility: undefined,
      serviceTimeout: 3000,
      requestConfig: {},
      resultConfig: {},
    });
  });
  it('deploy segment', async () => {
    await deploy('segment');

    const profile = await getProfile();

    assert.calledWith(deploySupport.makeService, {
      description: 'Module as a service',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::${profile.accountId}:role/aliyunfcgeneratedrole-maas`,
      serviceName: 'maas',
      vpcConfig: undefined
    });
    
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

    assert.calledWith(deploySupport.makeGroup, {
      description: 'api group for function compute',
      name: 'maasapi'
    });
    assert.calledWith(deploySupport.makeApi, {}, {
      apiName: 'segment_post',
      auth: { config: undefined, type: undefined },
      functionName: 'doSegment',
      method: 'post',
      parameters: undefined,
      requestPath: '/do_segment',
      roleArn: `acs:ram::${profile.accountId}:role/aliyunapigatewayaccessingfcrole`,
      serviceName: 'mass',
      stageName: 'RELEASE',
      visibility: undefined,
      resultConfig: {  },
      serviceTimeout: 3000,
      requestConfig: {  }
    });
  });
  it('deploy timer', async () => {
    await deploy('timer');

    const profile = await getProfile();

    assert.calledWith(deploySupport.makeService, {
      description: undefined,
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::${profile.accountId}:role/aliyunfcgeneratedrole-myservice`,
      serviceName: 'MyService',
      vpcConfig: undefined
    });
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

    const profile = await getProfile();

    assert.calledWith(deploySupport.makeService, {
      description: 'wechat demo',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::${profile.accountId}:role/aliyunfcgeneratedrole-wechat`,
      serviceName: 'wechat',
      vpcConfig: undefined
    });
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
    assert.alwaysCalledWith(deploySupport.makeGroup, {
      description: 'api group for function compute',
      name: 'wechat_group'
    });
    assert.calledWith(deploySupport.makeApi.firstCall, {}, {
      apiName: 'wechat_get',
      auth: { config: undefined, type: undefined },
      functionName: 'get',
      method: 'get',
      parameters: [
        { apiParameterName: 'encrypt_type' },
        { apiParameterName: 'msg_signature' },
        { location: 'Query', apiParameterName: 'timestamp', required: 'REQUIRED', parameterType: 'String' },
        { location: 'Query', apiParameterName: 'nonce', parameterType: 'String' },
        { location: 'Query', apiParameterName: 'signature', parameterType: 'String' },
        { location: 'Query', apiParameterName: 'echostr', parameterType: 'String' }
      ],
      requestPath: '/wechat',
      roleArn: `acs:ram::${profile.accountId}:role/aliyunapigatewayaccessingfcrole`,
      serviceName: 'wechat',
      stageName: 'RELEASE',
      visibility: undefined,
      requestConfig: {  },
      resultConfig: {  },
      serviceTimeout: 3000
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
    assert.calledWith(deploySupport.makeApi.secondCall, {}, {
      apiName: 'wechat_post',
      auth: { config: undefined, type: undefined },
      functionName: 'post',
      method: 'post',
      parameters: [
        { location: 'Query', apiParameterName: 'timestamp', required: 'REQUIRED', parameterType: 'String' }, 
        { location: 'Query', apiParameterName: 'nonce', parameterType: 'String' }, 
        { location: 'Query', apiParameterName: 'signature', parameterType: 'String' }, 
        { location: 'Query', apiParameterName: 'msg_signature', parameterType: 'String' }, 
        { location: 'Query', apiParameterName: 'encrypt_type', parameterType: 'String' }
      ],
      requestPath: '/wechat',
      roleArn: `acs:ram::${profile.accountId}:role/aliyunapigatewayaccessingfcrole`,
      serviceName: 'wechat',
      stageName: 'RELEASE',
      visibility: undefined,
      requestConfig: {  },
      resultConfig: {  },
      serviceTimeout: 3000
    });
  });
});