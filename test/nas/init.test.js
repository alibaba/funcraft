'use strict';

const fs = require('fs-extra');
const path = require('path');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const profile = {
  getProfile: sandbox.stub()
};
const deploy = {
  deployService: sandbox.stub()
};

const nasInitStub = proxyquire('../../lib/nas/init', {
  '../profile': profile,
  '../deploy/deploy-by-tpl': deploy
});
const baseDir = '/test-dir';
const proflieRes = {
  defaultRegion: 'cn-hangzhou', 
  accountId: '12345', 
  accessKeyId: '123', 
  timeout: 60
};
describe('test fun nas init', () => {
  let fsPathExists;
  beforeEach(() => {
    fsPathExists = sandbox.stub(fs, 'pathExists');
  });
  afterEach(() => {
    sandbox.reset();
  });

  it('function deployNasService', async () => {
    const nasConfig = {
      UserId: 10003,
      GroupId: 10003,
      MountPoints: [{
        ServerAddr: '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com:/',
        MountDir: '/mnt/nas'
      }]
    };
    const vpcConfig = {
      VpcId: 'vpc-uf6p2abfodpmpmzu6onhy',
      VSwitchIds: [
        'vsw-uf6074gzypzsc95idtxk8'
      ],
      SecurityGroupId: 'sg-uf6h3g45f2fo5lr04akb'
    };
    const tpl = {
      ROSTemplateFormatVersion: '2015-09-01',
      Transform: 'Aliyun::Serverless-2018-04-03',
      Resources: {
        'fun-nas-test': {
          Type: 'Aliyun::Serverless::Service',
          Properties: {
            VpcConfig: vpcConfig, 
            NasConfig: nasConfig
          }
        }
      }
    };
    const serviceName = 'fun-nas-test';
    const nasServiceName = 'fun-nas-' + serviceName;
    const nasFunctionName = 'fun-nas-function';
    
    const zipCodePath = path.resolve(__dirname, '../../lib/fc-utils/fc-fun-nas-server/dist/fun-nas-server.zip');
    const nasServiceRes = {
      'Type': 'Aliyun::Serverless::Service',
      'Properties': {
        'Description': `service for fc nas used for service ${serviceName}`,
        'VpcConfig': vpcConfig,
        'NasConfig': nasConfig
      },
      [nasFunctionName]: {
        Type: 'Aliyun::Serverless::Function',
        Properties: {
          Handler: 'index.handler',
          Runtime: 'nodejs10',
          CodeUri: zipCodePath,
          Timeout: 600,
          EnvironmentVariables: {
            PATH: '/code/.fun/root/usr/bin'
          }
        },
        Events: {
          httpTrigger: {
            Type: 'HTTP',
            Properties: {
              AuthType: 'FUNCTION',
              Methods: ['POST', 'GET']
            }
          }
        }
      }
    };
    profile.getProfile.returns(proflieRes);
    fsPathExists.resolves(true);

    await nasInitStub.deployNasService(baseDir, tpl);

    assert.calledWith(fsPathExists, zipCodePath);
    assert.calledWith(deploy.deployService, baseDir, nasServiceName, nasServiceRes);
  });
    
}); 