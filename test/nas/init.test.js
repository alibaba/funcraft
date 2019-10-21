'use strict';

const path = require('path');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const nasMockData = require('../commands/nas/mock-data');
const constants = require('../../lib/nas/constants');
const { setProcess } = require('../test-utils');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const baseDir = path.join('/', 'test-dir');

describe('test fun nas init', () => {
  
  let restoreProcess;
  const deploy = {
    deployService: sandbox.stub()
  };
  const nas = {
    convertNasConfigToNasMappings: sandbox.stub()
  };
  const fs = {
    pathExists: sandbox.stub(),
    readFile: sandbox.stub()
  };
  const request = {
    statsRequest: sandbox.stub()
  };
  const support = {
    isNasServerStale: sandbox.stub()
  };
  const nasInitStub = proxyquire('../../lib/nas/init', {
    '../deploy/deploy-by-tpl': deploy, 
    '../nas': nas, 
    'fs-extra': fs, 
    './request': request, 
    './support': support
  });
  beforeEach(() => {

    restoreProcess = setProcess({
      ACCOUNT_ID: 'ACCOUNT_ID',
      DEFAULT_REGION: 'cn-shanghai',
      ACCESS_KEY_ID: 'ACCESS_KEY_ID',
      ACCESS_KEY_SECRET: 'ACCESS_KEY_SECRET'
    });
    request.statsRequest.returns({
      headers: 200, 
      data: {
        path: '/mnt/nas',
        exists: true,
        isDir: true,
        isFile: false, 
        UserId: 100, 
        GroupId: 100, 
        mode: 123
      }
    });
    support.isNasServerStale.returns(true);
    fs.pathExists.returns(true);
    fs.readFile.returns(Buffer.from('123'));
  }); 

  afterEach(() => {
    restoreProcess();
    sandbox.reset();
  });
  
  it('function deployNasService without service', async () => {
    
    const serviceName = 'fun-nas-test';
    const nasServiceName = constants.FUN_NAS_SERVICE_PREFIX + serviceName;
    const nasFunctionName = constants.FUN_NAS_FUNCTION;
    
    const zipCodePath = path.resolve(__dirname, '../../lib/utils/fun-nas-server/dist/fun-nas-server.zip');
    
    const nasServiceRes = {
      'Type': 'Aliyun::Serverless::Service',
      'Properties': {
        'Description': `service for fc nas used for service ${serviceName}`,
        'VpcConfig': nasMockData.vpcConfig,
        'NasConfig': nasMockData.nasConfig
      },
      [nasFunctionName]: {
        Type: 'Aliyun::Serverless::Function',
        Properties: {
          Handler: 'index.handler',
          Runtime: 'nodejs10',
          CodeUri: zipCodePath,
          Timeout: 600,
          MemorySize: 256,
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
    
    nas.convertNasConfigToNasMappings.returns([{localNasDir: baseDir, remoteNasDir: baseDir}]);
    await nasInitStub.deployNasService(baseDir, nasMockData.tpl);

    assert.calledWith(fs.pathExists, zipCodePath);
    assert.calledWith(deploy.deployService, baseDir, nasServiceName, nasServiceRes);

  });
    
}); 