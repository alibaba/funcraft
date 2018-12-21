'use strict';

const docker = require('../lib/docker');

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const os = require('os');

let func = require('../lib/function');

describe('test invokeFunction', async () => {

  const codeUri = '/';

  const functionProps = {
    'Properties': {
      'Handler': 'index.handler',
      'CodeUri': codeUri,
      'Initializer': 'index.initializer',
      'Description': 'Hello world with python3!',
      'Runtime': 'python3'
    }
  };

  const tplPath = os.tmpdir();

  const nasMount = {
    Type: 'bind',
    Source: '/nas',
    Target: '/mnt/test',
    ReadOnly: false
  };

  const codeMount = {
    Type: 'bind',
    Source: '/',
    Target: '/code',
    ReadOnly: true
  };

  const nasConfig = {
    UserId: -1,
    GroupId: -1,
    MountPoints: [
      {
        ServerAddr: '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/subdir',
        MountDir: '/mnt/test'
      }
    ]
  };

  const debugPort = 9000;

  const debugIde = 'vscode';

  const httpParams = 'http params';

  const envs = ['envKey=envValue'];

  const dockerUser = '0:0';

  const cmd = 'cmd';

  const dockerOpts = { test: 'testOpts' };

  const containerName = 'test-container';

  const event = 'event';

  const runtime = 'python3';

  const image = 'aliyunfc/runtime-python3:tag';

  beforeEach(() => {

    sandbox.stub(docker, 'pullImageIfNeed').resolves({});
    sandbox.stub(docker, 'resolveCodeUriToMount').resolves(codeMount);
    sandbox.stub(docker, 'resolveNasConfigToMount').withArgs(nasConfig, tplPath).returns(nasMount);
    sandbox.stub(docker, 'resolveDockerUser').resolves(dockerUser);
    sandbox.stub(docker, 'resolveRuntimeToDockerImage').withArgs(runtime).returns(image);
    sandbox.stub(docker, 'generateRamdomContainerName').returns(containerName);
    sandbox.stub(docker, 'generateDockerEnvs').resolves(envs);
    sandbox.stub(docker, 'generateDockerCmd').returns(cmd);
    sandbox.stub(docker, 'generateDockerOpts').resolves(dockerOpts);
    sandbox.stub(docker, 'showDebugIdeTips').resolves({});
    sandbox.stub(docker, 'run').resolves({});

    func = proxyquire('../lib/function', {
      './docker': docker
    });
  });

  afterEach(() => {
    sandbox.restore();
  });


  it('test invoke function', async () => {
    await func.invokeFunction('test', 'test', functionProps, debugPort, event, debugIde, httpParams, process.stdout, process.stderr, nasConfig, tplPath, false);

    assert.calledWith(docker.resolveCodeUriToMount, codeUri);
    assert.calledWith(docker.resolveNasConfigToMount, nasConfig, tplPath);
    assert.calledWith(docker.resolveDockerUser, nasConfig);
    assert.calledWith(docker.resolveRuntimeToDockerImage, runtime);
    assert.calledWith(docker.pullImageIfNeed, image);
    assert.calledOnce(docker.showDebugIdeTips);
    assert.calledOnce(docker.generateRamdomContainerName);
    assert.calledWith(docker.generateDockerEnvs, functionProps.Properties, debugPort, httpParams);

    assert.calledWith(docker.generateDockerOpts, runtime, containerName, 
      [ codeMount, nasMount ], cmd, debugPort, envs, dockerUser);
      
    assert.calledWith(docker.run, dockerOpts, containerName, event, process.stdout, process.stderr);
  });

  it('test invoke function without nasConfig', async () => {
    await func.invokeFunction('test', 'test', functionProps, debugPort, event, debugIde, httpParams, process.stdout, process.stderr, null, tplPath, false);

    assert.calledWith(docker.resolveCodeUriToMount, codeUri);
    assert.calledWith(docker.resolveNasConfigToMount, null, tplPath);
    assert.calledWith(docker.resolveDockerUser, null);
    assert.calledWith(docker.resolveRuntimeToDockerImage, runtime);
    assert.calledWith(docker.pullImageIfNeed, image);
    assert.calledOnce(docker.showDebugIdeTips);
    assert.calledOnce(docker.generateRamdomContainerName);
    assert.calledWith(docker.generateDockerCmd, functionProps.Properties, false);
    assert.calledWith(docker.generateDockerEnvs, functionProps.Properties, debugPort, httpParams);

    assert.calledWith(docker.generateDockerOpts, runtime, containerName, 
      [ codeMount ], cmd, debugPort, envs, dockerUser);
      
    assert.calledWith(docker.run, dockerOpts, containerName, event, process.stdout, process.stderr);
  });

  it('test invoke function without debug port', async () => {
    await func.invokeFunction('test', 'test', functionProps, null, event, null, httpParams, process.stdout, process.stderr, nasConfig, tplPath, false);

    assert.calledWith(docker.resolveCodeUriToMount, codeUri);
    assert.calledWith(docker.resolveNasConfigToMount, nasConfig, tplPath);
    assert.calledWith(docker.resolveDockerUser, nasConfig);
    assert.calledWith(docker.resolveRuntimeToDockerImage, runtime);
    assert.calledWith(docker.pullImageIfNeed, image);
    assert.notCalled(docker.showDebugIdeTips);
    assert.calledOnce(docker.generateRamdomContainerName);
    assert.calledWith(docker.generateDockerCmd, functionProps.Properties, false);
    assert.calledWith(docker.generateDockerEnvs, functionProps.Properties, null, httpParams);

    assert.calledWith(docker.generateDockerOpts, runtime, containerName, 
      [ codeMount, nasMount ], cmd, null, envs, dockerUser);
      
    assert.calledWith(docker.run, dockerOpts, containerName, event, process.stdout, process.stderr);
  });

  it('test invoke function with http mode', async () => {
    await func.invokeFunction('test', 'test', functionProps, debugPort, event, debugIde, httpParams, process.stdout, process.stderr, nasConfig, tplPath, true);

    assert.calledWith(docker.resolveCodeUriToMount, codeUri);
    assert.calledWith(docker.resolveNasConfigToMount, nasConfig, tplPath);
    assert.calledWith(docker.resolveDockerUser, nasConfig);
    assert.calledWith(docker.resolveRuntimeToDockerImage, runtime);
    assert.calledWith(docker.pullImageIfNeed, image);
    assert.calledOnce(docker.showDebugIdeTips);
    assert.calledWith(docker.generateDockerCmd, functionProps.Properties, true);
    assert.calledOnce(docker.generateRamdomContainerName);
    assert.calledWith(docker.generateDockerEnvs, functionProps.Properties, debugPort, httpParams);

    assert.calledWith(docker.generateDockerOpts, runtime, containerName, 
      [ codeMount, nasMount ], cmd, debugPort, envs, dockerUser);
      
    assert.calledWith(docker.run, dockerOpts, containerName, event, process.stdout, process.stderr);
  });
});
