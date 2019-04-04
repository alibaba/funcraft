'use strict';

var nock = require('nock');

let deploySupport = require('../../lib/deploy/deploy-support');

const ram = require('../../lib/ram');
const { setProcess } = require('../test-utils');
const proxyquire = require('proxyquire');
const FC = require('@alicloud/fc2');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const zip = require('../../lib/package/zip');
const expect = require('expect.js');



describe('make', () => {

  let restoreProcess;

  beforeEach(() => {
    restoreProcess = setProcess({
      ACCOUNT_ID: '12384123985012938421',
      DEFAULT_REGION: 'cn-shanghai',
      ACCESS_KEY_ID: 'LTAIsgxsdfDokKbBS',
      ACCESS_KEY_SECRET: 'Icngqpy03DtasdfasJWvLHDF2C2szm5ZgM',
    });

    if (!nock.isActive()) {
      nock.activate();
    }
  });

  afterEach(() => {
    restoreProcess();
    nock.cleanAll();
    nock.restore();
  });


  it('makeApi', async () => {

    nock('http://apigateway.cn-shanghai.aliyuncs.com:80', { 'encodedQueryParams': true })
      .get('/')
      .query(actualQueryObject => actualQueryObject.Action === 'DescribeApis')
      .reply(200, {
        'PageNumber': 1,
        'TotalCount': 1,
        'PageSize': 10,
        'RequestId': '19F6EEBA-4ED9-48E1-8D81-9E23452C5851',
        'ApiSummarys': {
          'ApiSummary': [
            {
              'Description': 'The awesome api',
              'CreatedTime': '2018-05-09T02:57:23Z',
              'ApiName': 'getUserInfo_token_get',
              'GroupName': 'aliyunfcdemo2',
              'RegionId': 'cn-shanghai',
              'ModifiedTime': '2018-05-20T02:08:26Z',
              'Visibility': 'PUBLIC',
              'GroupId': '9080be4b4a4b4faabdd04fe61c2131e0',
              'ApiId': 'a162a8579831452389c311a8cd2764c0'
            }
          ]
        }
      }, []);

    nock('http://apigateway.cn-shanghai.aliyuncs.com:80', { 'encodedQueryParams': true })
      .get('/')
      .query(actualQueryObject => actualQueryObject.Action === 'ModifyApi')
      .reply(200, { 'RequestId': '9C6EEB8E-C5B2-42C6-A261-94111715C27B' }, []);

    nock('http://apigateway.cn-shanghai.aliyuncs.com:80', { 'encodedQueryParams': true })
      .get('/')
      .query(actualQueryObject => actualQueryObject.Action === 'DeployApi')
      .reply(200, { 'RequestId': 'B2D623A6-EB24-4E92-B6CE-688834B25859' }, []);

    nock('http://apigateway.cn-shanghai.aliyuncs.com:80', { 'encodedQueryParams': true })
      .get('/')
      .query(actualQueryObject => actualQueryObject.Action === 'DescribeApi')
      .reply(200, {
        'ErrorCodeSamples': {
          'ErrorCodeSample': []
        },
        'Mock': 'CLOSED', 'CustomSystemParameters': {
          'CustomSystemParameter': []
        },
        'RequestParameters': {
          'RequestParameter': [
            {
              'Required': 'OPTIONAL',
              'ParameterType': 'STRING',
              'ApiParameterName': 'token',
              'DocShow': 'PUBLIC',
              'Location': 'PATH',
              'DocOrder': 0
            }
          ]
        },
        'GroupId': '9080be4b4a4b4faabdd04fe61c2131e0',
        'DeployedInfos': {
          'DeployedInfo': [
            {
              'DeployedStatus': 'DEPLOYED',
              'StageName': 'RELEASE',
              'EffectiveVersion': '20180520104941546'
            },
            {
              'DeployedStatus': 'NONDEPLOYED',
              'StageName': 'PRE'
            }, {
              'DeployedStatus': 'NONDEPLOYED', 'StageName': 'TEST'
            }
          ]
        },
        'ServiceParametersMap': {
          'ServiceParameterMap': [
            {
              'ServiceParameterName': 'token',
              'RequestParameterName': 'token'
            }
          ]
        },
        'MockResult': '',
        'ServiceConfig': {
          'ServiceProtocol': 'FunctionCompute',
          'ContentTypeValue': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Mock': 'FALSE',
          'MockResult': '',
          'ServiceTimeout': 3000,
          'ServiceAddress': '',
          'ServicePath': '',
          'ServiceHttpMethod': '',
          'ContentTypeCatagory': 'DEFAULT',
          'ServiceVpcEnable': 'FALSE'
        },
        'ApiId': 'a162a8579831452389c311a8cd2764c0',
        'AuthType': 'ANONYMOUS',
        'ResultSample': 'result sample',
        'ResultType': 'PASSTHROUGH',
        'ResultDescriptions': {
          'ResultDescription': []
        },
        'Description': 'The awesome api',
        'CreatedTime': '2018-05-09T02:57:23Z',
        'ApiName': 'getUserInfo_token_get',
        'GroupName': 'aliyunfcdemo2',
        'ModifiedTime': '2018-05-20T02:43:24Z',
        'ConstantParameters': {
          'ConstantParameter': []
        }, 'SystemParameters': {
          'SystemParameter': []
        }, 'ServiceParameters': {
          'ServiceParameter': [
            {
              'ServiceParameterName': 'token',
              'ParameterType': 'STRING',
              'Location': 'path'
            }
          ]
        },
        'AllowSignatureMethod': 'HmacSHA256',
        'RequestId': 'EFAA4252-CA24-40D6-B52F-C56117DD8FBC',
        'RegionId': 'cn-shanghai',
        'RequestConfig': {
          'RequestHttpMethod': 'GET',
          'RequestProtocol': 'HTTP',
          'BodyFormat': '',
          'PostBodyDescription': '',
          'RequestPath': '/getUserInfo/[token]',
          'RequestMode': 'MAPPING'
        },
        'Visibility': 'PUBLIC',
        'WebSocketApiType': 'COMMON'
      }, []);

    await deploySupport.makeApi({ GroupId: '9080be4b4a4b4faabdd04fe61c2131e0' }, {
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
      role: {
        Role: {
          Arn: 'asdfas'
        }
      },
      serviceName: 'fc',
      stageName: 'RELEASE',
      visibility: 'PRIVATE'
    });

  });

  it.skip('makeApiTrigger', async () => {

    nock('https://ram.aliyuncs.com:443', { 'encodedQueryParams': true })
      .get('/')
      .query(actualQueryObject => actualQueryObject.Action === 'GetRole')
      .reply(200, {
        'RequestId': 'D0FAE93F-E16C-4C6F-AA97-4CB343A36C27',
        'Role': {
          'RoleName': 'apigatewayAccessFC',
          'Description': 'API Gateway access FunctionCompute',
          'AssumeRolePolicyDocument': '{\n    "Statement": [{\n"Action": "sts:AssumeRole",\n            "Effect": "Allow",\n            "Principal": {"Service": ["apigateway.aliyuncs.com"]}}],\n    "Version": "1"}', 'Arn': 'acs:ram::1751705494334733:role/apigatewayaccessfc',
          'CreateDate': '2018-04-27T12:17:37Z',
          'RoleId': '357770690351169377'
        }
      }, []);

    nock('https://ram.aliyuncs.com:443', { 'encodedQueryParams': true })
      .get('/')
      .query(actualQueryObject => actualQueryObject.Action === 'ListPoliciesForRole')
      .reply(200, {
        'Policies': {
          'Policy': [{
            'Description': '调用函数计算(FC)服务函数的权限',
            'PolicyName': 'AliyunFCInvocationAccess',
            'AttachDate': '2018-04-27T12:17:37Z',
            'DefaultVersion': 'v1',
            'PolicyType': 'System'
          }]
        }, 'RequestId': '16FFCF68-25DB-4CB1-8108-E0653FC1C1EA'
      }, []);



    nock('http://apigateway.cn-shanghai.aliyuncs.com:80', { 'encodedQueryParams': true })
      .get('/')
      .query(actualQueryObject => actualQueryObject.Action === 'DescribeApiGroups')
      .reply(200, {
        'PageNumber': 1,
        'ApiGroupAttributes': {
          'ApiGroupAttribute': [{
            'TrafficLimit': 500,
            'Description': 'api group for function compute fc/helloworld',
            'CreatedTime': '2018-04-27T12:18:43Z',
            'GroupName': 'fc_fc_helloworld',
            'SubDomain': '64c14bce7b0e470ba2a1a4ac6191042d-cn-shanghai.alicloudapi.com',
            'RegionId': 'cn-shanghai',
            'BillingStatus': 'NORMAL',
            'ModifiedTime': '2018-04-27T12:18:43Z',
            'GroupId': '64c14bce7b0e470ba2a1a4ac6191042d',
            'IllegalStatus': 'NORMAL'
          }]
        }, 'TotalCount': 1, 'PageSize': 10, 'RequestId': '57AC65D9-1262-4AFE-86C5-463ED4D611FC'
      }, []);


    nock('http://apigateway.cn-shanghai.aliyuncs.com:80', { 'encodedQueryParams': true })
      .get('/')
      .query(actualQueryObject => actualQueryObject.Action === 'DescribeApis')
      .reply(200, {
        'PageNumber': 1,
        'TotalCount': 1,
        'PageSize': 10,
        'RequestId': '90222CAC-C4BD-4A67-A52C-C5EA17325AAE',
        'ApiSummarys': {
          'ApiSummary': [{
            'Description': 'The awesome api',
            'CreatedTime': '2018-05-09T02:57:23Z',
            'ApiName': 'getUserInfo_token_get',
            'GroupName': 'aliyunfcdemo2',
            'RegionId': 'cn-shanghai',
            'ModifiedTime': '2018-05-20T02:43:24Z',
            'Visibility': 'PUBLIC',
            'GroupId': '9080be4b4a4b4faabdd04fe61c2131e0',
            'ApiId': 'a162a8579831452389c311a8cd2764c0'
          }]
        }
      }, []);

    nock('http://apigateway.cn-shanghai.aliyuncs.com:80', { 'encodedQueryParams': true })
      .get('/')
      .query(actualQueryObject => actualQueryObject.Action === 'ModifyApi')
      .reply(200, { 'RequestId': '776A0731-DEDF-4F71-80B5-979B17F7034E' });

    nock('http://apigateway.cn-shanghai.aliyuncs.com:80', { 'encodedQueryParams': true })
      .get('/')
      .query(actualQueryObject => actualQueryObject.Action === 'DeployApi')
      .reply(200, { 'RequestId': '62112293-5607-4BD5-827F-28FDA54D0D64' }, []);

    await deploySupport.makeApiTrigger({
      serviceName: 'fc',
      functionName: 'helloworld',
      triggerName: 'GetResource',
      method: 'GET',
      requestPath: '/helloworld',
      restApiId: undefined
    });
  });

});
describe.only('Incorrect environmental variables', ()=> {
  let restoreProcess;

  beforeEach(async () => {
    sandbox.stub(FC.prototype, 'getFunction').resolves({});
    sandbox.stub(FC.prototype, 'test').returns("just mocked method");
    sandbox.stub(FC.prototype, 'updateFunction').resolves({});
    sandbox.stub(zip, 'pack').resolves('');

    deploySupport = await proxyquire('../../lib/deploy/deploy-support', {
      '../package/zip': zip,
      '@alicloud/fc2': FC
    });

    restoreProcess = setProcess({
      ACCOUNT_ID: '1984152879328320',
      ACCESS_KEY_ID: 'LTAIE3emdof8Hf9H',
      ACCESS_KEY_SECRET: 'afme03g3q4yv1vtew2kIyrjTslbqb4',
    });
  });

    afterEach(() => {
      sandbox.restore();
      restoreProcess();
  });

  it('should cast env value to String', async ()=> {
    let dir = 'D:\\fun\\fun.git\\examples\\local';
     await deploySupport.makeFunction(dir,{
      serviceName : 'localdemo',
      functionName : 'nodejs6',
      description : 'Hello world with nodejs6!',
      handler : 'index.handler',
      initializer : null,
      timeout :3,
      initializationTimeout : 3,
      memorySize : 128,
      runtime :'nodejs6',
      codeUri : `${dir}\\nodejs6`,
      environmentVariables : {"StringTypeValue1":123,"StringTypeValue2":"test"}
    });    
    
    assert.calledWith(
        FC.prototype.updateFunction,
       'localdemo',
       'nodejs6',
       {
        description: "Hello world with nodejs6!",
        handler: "index.handler",
        initializer: null,
        timeout: 3,
        initializationTimeout: 3,
        memorySize: 128,
        runtime: "nodejs6",
        code: {
            zipFile: ''
        },
        environmentVariables: {
            StringTypeValue1: "123",
            StringTypeValue2: "test",
            LD_LIBRARY_PATH: "/code/.fun/root/usr/lib:/code/.fun/root/usr/lib/x86_64-linux-gnu:/code:/code/lib:/usr/local/lib",
            PATH: "/code/.fun/root/usr/local/bin:/code/.fun/root/usr/local/sbin:/code/.fun/root/usr/bin:/code/.fun/root/usr/sbin:/code/.fun/root/sbin:/code/.fun/root/bin:/code/.fun/python/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/sbin:/bin",
            PYTHONUSERBASE: "/code/.fun/python"
        }
    });
  })
});

describe('make invocation role', () => {

  let restoreProcess;

  beforeEach(async () => {

    sandbox.stub(ram, 'makeRole').resolves({
      Role: 'generated-role-name'
    });
    sandbox.stub(ram, 'makePolicy').resolves({});
    sandbox.stub(ram, 'attachPolicyToRole').resolves({});

    deploySupport = await proxyquire('../../lib/deploy/deploy-support', {
      '../../lib/ram': ram
    });

    restoreProcess = setProcess({
      ACCOUNT_ID: 'testAccountId',
      ACCESS_KEY_ID: 'testKeyId',
      ACCESS_KEY_SECRET: 'testKeySecret',
    });
  });

  afterEach(() => {
    sandbox.restore();
    restoreProcess();
  });

  it('makeInvocationRole of log', async () => {
    const role = await deploySupport.makeInvocationRole('test-service_name', 'test-function_name', 'Log');

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
    const role = await deploySupport.makeInvocationRole('test-service_name', 'test-function_name', 'RDS');

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
    const role = await deploySupport.makeInvocationRole('test-service_name', 'test-function_name', 'MNSTopic');

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
    const role = await deploySupport.makeInvocationRole('test-service_name', 'test-function_name', 'TableStore');

    assert.calledOnce(ram.makeRole);
    assert.calledWith(ram.makeRole,
      'FunCreateRole-test-service-name-test-function-name',
      true,
      'Used for fc invocation',
      {
        Statement: [{
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: { RAM: ['acs:ram::1604337383174619:root'] }        }],
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
});

describe('test getFunCodeAsBase64', () => {

  let restoreProcess;

  beforeEach(async () => {

    sandbox.stub(zip, 'pack').resolves({});

    deploySupport = await proxyquire('../../lib/deploy/deploy-support', {
      '../package/zip': zip
    });

    restoreProcess = setProcess({
      ACCOUNT_ID: 'testAccountId',
      ACCESS_KEY_ID: 'testKeyId',
      ACCESS_KEY_SECRET: 'testKeySecret',
    });
  });

  afterEach(() => {
    sandbox.restore();
    restoreProcess();
  });

  it('test getFunCodeAsBase64: codeUri outside baseDir', async () => {
    await deploySupport.getFunCodeAsBase64('/a/b', '/a');
    assert.calledWith(zip.pack, '/a', null);
  });


  it('test getFunCodeAsBase64: codeUri outside baseDir2', async () => {
    await deploySupport.getFunCodeAsBase64('/a/b', '../');
    assert.calledWith(zip.pack, '../', null);
  });

  it('test getFunCodeAsBase64: codeUri within baseDir', async () => {
    await deploySupport.getFunCodeAsBase64('/a/b', '/a/b/c');
    assert.calledWith(zip.pack, '/a/b/c', sinon.match.func);
  });

});