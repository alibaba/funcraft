'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const deploySupport = require('../../lib/deploy/deploy-support');
const ram = require('../../lib/ram');

describe('deploy', () => {
  beforeEach(() => {
    Object.keys(deploySupport).forEach(m => {
      sandbox.stub(deploySupport, m).resolves({});
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
  });

  afterEach(() => {
    sandbox.restore();
  });

  async function deploy(example) {
    await proxyquire('../../lib/deploy/deploy-by-tpl', {
      './deploy-support': deploySupport,
      '../ram': ram
    })(`./examples/${example}/template.yml`);

    // await proxyquire('../../lib/deploy/deploy-support', {
      
    // })(`./examples/${example}/template.yml`);
  }

  it('deploy datahub', async () => {
    await deploy('datahub');

    assert.calledWith(deploySupport.makeService, {
      description: undefined,
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'MyService',
      vpcConfig: undefined
    });
  
    assert.calledWith(deploySupport.makeFunction, {
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
      environmentVariables: undefined
    });
  });

  it('deploy helloworld', async () => {
    await deploy('helloworld');

    assert.calledWith(deploySupport.makeService, {
      description: 'fc test',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'fc',
      vpcConfig: undefined
    });
    assert.calledWith(deploySupport.makeFunction, {
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
      environmentVariables: undefined
    });
  });

  it('deploy java', async () => {
    await deploy('java');

    assert.calledWith(deploySupport.makeService, {
      description: 'java demo',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'java',
      vpcConfig: undefined
    });
    assert.calledWith(deploySupport.makeFunction, {
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
      environmentVariables: undefined
    });

  });

  it('deploy openid_connect', async () => {
    await deploy('openid_connect');

    assert.calledWith(deploySupport.makeService, {
      description: 'fc test',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'fc',
      vpcConfig: undefined
    });

    assert.calledWith(deploySupport.makeFunction, {
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
      environmentVariables: undefined
    });
    assert.calledWith(deploySupport.makeGroup, {
      name: 'aliyunfcdemo2',
      description: 'api group for function compute'
    });
    assert.calledWith(deploySupport.makeApi, {}, {
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
      parameters: [
        {
          location: 'Path',
          apiParameterName: 'token',
          parameterType: 'REQUIRED',
          type: 'String'
        }
      ],
      requestPath: '/getUserInfo/[token]',
      roleArn: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'fc',
      stageName: 'RELEASE',
      visibility: 'PRIVATE',
      serviceTimeout: 3000,
      constantParameters: undefined,
      resultConfig: { failResultSample: undefined, resultSample: undefined, resultType: undefined },      
      requestConfig: {  }
    });
  });

  it('deploy ots_stream', async () => {
    await deploy('ots_stream');

    assert.calledWith(deploySupport.makeService, {
      description: 'Stream trigger for OTS',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'otsstream',
      vpcConfig: undefined
    });
    assert.calledWith(deploySupport.makeFunction, {
      codeUri: './',
      description: undefined,
      functionName: 'processor',
      handler: 'main.index',
      initializer: undefined,
      memorySize: undefined,
      runtime: 'nodejs8',
      serviceName: 'otsstream',
      timeout: undefined,
      initializationTimeout: undefined,
      environmentVariables: undefined
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

  it('deploy sls_demo', async () => {
    await deploy('sls_demo');

    assert.calledWith(deploySupport.makeService, {
      description: 'sls test',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'log-compute',
      vpcConfig: undefined
    });
    assert.calledWith(deploySupport.makeFunction, {
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
      environmentVariables: undefined
    });
    assert.calledWith(deploySupport.makeTrigger, {
      serviceName: 'log-compute',
      functionName: 'log-compute',
      triggerName: 'log-stream',
      triggerType: 'Log',
      triggerProperties: {
        Enable: true,
        JobConfig: { MaxRetryTime: 1, TriggerInterval: 30 },
        LogConfig: { Logstore: 'log-en-m', Project: 'log-com-m' },
        SourceConfig: { Logstore: 'log-com-m' }
      },
    });
  });

  it('deploy python', async () => {
    await deploy('python');

    assert.calledWith(deploySupport.makeService, {
      description: 'python demo',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'pythondemo',
      vpcConfig: undefined
    });
    assert.calledWith(deploySupport.makeFunction, {
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
      environmentVariables: undefined
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
      description: undefined,
      functionName: 'hello',
      method: 'get',
      parameters: undefined,
      requestPath: '/python/hello',
      roleArn: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'pythondemo',
      stageName: 'RELEASE',
      visibility: undefined,
      serviceTimeout: 3000,
      requestConfig: {},
      constantParameters: undefined,
      resultConfig: { failResultSample: undefined, resultSample: undefined, resultType: undefined },    });
  });
  it('deploy segment', async () => {
    await deploy('segment');

    assert.calledWith(deploySupport.makeService, {
      description: 'Module as a service',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'maas',
      vpcConfig: undefined
    });
    
    assert.calledWith(deploySupport.makeFunction, {
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
      environmentVariables: undefined
    });

    assert.calledWith(deploySupport.makeGroup, {
      description: 'api group for function compute',
      name: 'maasapi'
    });
    assert.calledWith(deploySupport.makeApi, {}, {
      description: undefined,
      apiName: 'segment_post',
      auth: { config: undefined, type: undefined },
      functionName: 'doSegment',
      method: 'post',
      parameters: undefined,
      requestPath: '/do_segment',
      roleArn: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'maas',
      stageName: 'RELEASE',
      visibility: undefined,
      resultConfig: { failResultSample: undefined, resultSample: undefined, resultType: undefined },
      constantParameters: undefined,
      serviceTimeout: 3000,
      requestConfig: { requestMode: 'PASSTHROUGH', requestProtocol: 'http' }
    });
  });
  it('deploy timer', async () => {
    await deploy('timer');

    assert.calledWith(deploySupport.makeService, {
      description: undefined,
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'MyService',
      vpcConfig: undefined
    });
    assert.calledWith(deploySupport.makeFunction, {
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
      environmentVariables: undefined
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

    assert.calledWith(deploySupport.makeService, {
      description: 'wechat demo',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'wechat',
      vpcConfig: undefined
    });
    assert.calledWith(deploySupport.makeFunction.firstCall, {
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
      environmentVariables: undefined
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
      description: undefined,
      parameters: [
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
      constantParameters: undefined,
      visibility: undefined,
      requestConfig: { bodyFormat: 'STREAM', requestMode: 'MAPPING', requestProtocol: 'HTTP' },
      resultConfig: { failResultSample: undefined, resultSample: undefined, resultType: undefined },      
      serviceTimeout: 3000
    });

    assert.calledWith(deploySupport.makeFunction.secondCall, {
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
      environmentVariables: undefined
    });
    assert.calledWith(deploySupport.makeApi.secondCall, {}, {
      apiName: 'wechat_post',
      auth: { config: undefined, type: undefined },
      functionName: 'post',
      method: 'post',
      description: undefined,
      parameters: [
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
      constantParameters: undefined,
      requestConfig: { bodyFormat: 'STREAM', requestMode: 'MAPPING', requestProtocol: 'HTTP' },
      resultConfig: { failResultSample: undefined, resultSample: undefined, resultType: undefined },      serviceTimeout: 3000
    });
  });

  it('deploy custom_domain', async () => {
    await deploy('custom_domain');

    assert.calledWith(deploySupport.makeCustomDomain, {
      domainName: 'fun.cn-shanghai.1221968287646227.cname-test.fc.aliyun-inc.com',
      protocol: 'HTTP',
      routeConfig: {
        routes: [
          {
            path: '/a',
            serviceName: 'serviceA',
            functionName: 'functionA',
          },
          {
            path: '/b',
            serviceName: 'serviceB',
            functionName: 'functionB',
          },
        ]
      }
    });
  });

  it('deploy initializer', async () => {
    await deploy('initializer');

    assert.calledWith(deploySupport.makeService, {
      description: 'initializer demo',
      internetAccess: null,
      logConfig: {  },
      role: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'initializerdemo',
      vpcConfig: undefined
    });
    assert.calledWith(deploySupport.makeFunction, {
      codeUri: './',
      description: 'Hello world with initializer!',
      functionName: 'initializer',
      handler: 'main.my_handler',
      initializer: 'main.my_initializer',
      memorySize: undefined,
      runtime: 'python2.7',
      serviceName: 'initializerdemo',
      timeout: undefined,
      initializationTimeout: undefined,
      environmentVariables: undefined
    });
    assert.calledWith(deploySupport.makeGroup, {
      description: 'api group for function compute',
      name: 'apigw_fc'
    });
    assert.calledWith(deploySupport.makeApi, {}, {
      apiName: 'initialize',
      auth: {
        config: undefined,
        type: undefined
      },
      description: undefined,
      functionName: 'initializer',
      method: 'get',
      parameters: undefined,
      requestPath: '/python/initializer',
      roleArn: `acs:ram::123:role/aliyunfcgeneratedrole-fc`,
      serviceName: 'initializerdemo',
      stageName: 'RELEASE',
      visibility: undefined,
      serviceTimeout: 3000,
      requestConfig: {},
      constantParameters: undefined,
      resultConfig: { failResultSample: undefined, resultSample: undefined, resultType: undefined },    });
  });
});
