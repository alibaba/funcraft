'use strict';

const path = require('path');
const expect = require('expect.js');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

let Invoke = require('../../lib/local/invoke');

const docker = require('../../lib/docker');
const dockerOpts = require('../../lib/docker-opts');

const proxyquire = require('proxyquire');

const { functionName, functionRes,
  functionProps, serviceName,
  serviceRes, serviceResWithNasConfig,
  debugPort, debugIde, codeMount,
  nasMounts } = require('./mock-data');

const baseDir = '.';
const tmpDir = path.resolve('.');

describe('test invoke construct and init', async () => {

  beforeEach(() => {

    sandbox.stub(docker, 'isDockerToolBoxAndEnsureDockerVersion').resolves({});
    sandbox.stub(docker, 'resolveCodeUriToMount').resolves(codeMount);
    sandbox.stub(docker, 'pullImageIfNeed').resolves({});
    sandbox.stub(docker, 'resolveTmpDirToMount').resolves({});
    sandbox.stub(dockerOpts, 'resolveRuntimeToDockerImage').resolves(`aliyunfc/runtime-python3.6:${dockerOpts.IMAGE_VERSION}`);

    Invoke = proxyquire('../../lib/local/invoke', {
      '../docker': docker,
      '../docker-opts': dockerOpts
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  function expectConstructConfigs(invoke) {
    expect(invoke.serviceName).to.eql(serviceName);
    expect(invoke.serviceRes).to.eql(serviceRes);
    expect(invoke.functionName).to.eql(functionName);
    expect(invoke.functionRes).to.eql(functionRes);
    expect(invoke.functionProps).to.eql(functionProps);
    expect(invoke.debugPort).to.eql(debugPort);
    expect(invoke.debugIde).to.eql(debugIde);
    expect(invoke.baseDir).to.eql(baseDir);

    expect(invoke.runtime).to.eql(functionProps.Runtime);
    expect(invoke.codeUri).to.eql(process.cwd());
  }

  it('test construct', async () => {
    const invoke = new Invoke(serviceName,
      serviceRes,
      functionName,
      functionRes,
      debugPort,
      debugIde,
      baseDir);

    expectConstructConfigs(invoke);
  });

  it('test init', async () => {

    const invoke = new Invoke(serviceName,
      serviceRes,
      functionName,
      functionRes,
      debugPort,
      debugIde,
      baseDir,
      tmpDir
    );

    await invoke.init();

    expect(invoke.nasConfig).to.eql(undefined);
    expect(invoke.dockerUser).to.eql('10003:10003');
    expect(invoke.nasMounts).to.eql([]);
    expect(invoke.codeMount).to.eql(codeMount);
    expect(invoke.containerName).to.contain('fun_local_');
    expect(invoke.imageName).to.contain(`aliyunfc/runtime-python3.6:${dockerOpts.IMAGE_VERSION}`);
    expect(invoke.tmpDir).to.eql(tmpDir);

    expect(invoke.mounts).to.eql([{
      Type: 'bind',
      Source: '/.',
      Target: '/',
      ReadOnly: false 
    }]);

    assert.calledWith(docker.pullImageIfNeed, `aliyunfc/runtime-python3.6:${dockerOpts.IMAGE_VERSION}`);
    assert.called(docker.isDockerToolBoxAndEnsureDockerVersion);
  });

  it('test init with nas config', async () => {

    const invoke = new Invoke(serviceName,
      serviceResWithNasConfig,
      functionName,
      functionRes,
      debugPort,
      debugIde,
      baseDir,
      tmpDir
    );

    await invoke.init();

    expect(invoke.nasConfig).to.eql({
      UserId: 10003,
      GroupId: 10003,
      MountPoints:
        [{
          ServerAddr: '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/',
          MountDir: '/mnt/nas'
        }]
    });

    expect(invoke.dockerUser).to.eql('10003:10003');
    expect(invoke.nasMounts).to.eql(nasMounts);
    expect(invoke.codeMount).to.eql(codeMount);
    expect(invoke.containerName).to.contain('fun_local_');
    expect(invoke.imageName).to.eql(`aliyunfc/runtime-python3.6:${dockerOpts.IMAGE_VERSION}`);
    expect(invoke.tmpDir).to.eql(tmpDir);

    expect(invoke.mounts).to.eql([
      {
        Type: 'bind',
        Source: '/.',
        Target: '/',
        ReadOnly: false
      },
      {
        Type: 'bind',
        Source: '/.fun/nas/012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com/',
        Target: '/mnt/nas',
        ReadOnly: false }
    ]);

    assert.calledWith(docker.pullImageIfNeed, `aliyunfc/runtime-python3.6:${dockerOpts.IMAGE_VERSION}`);
  });
});

describe('test showDebugIdeTips', async () => {

  beforeEach(() => {

    sandbox.stub(docker, 'isDockerToolBoxAndEnsureDockerVersion').resolves({});
    sandbox.stub(docker, 'resolveCodeUriToMount').resolves(codeMount);
    sandbox.stub(docker, 'pullImageIfNeed').resolves({});
    sandbox.stub(docker, 'resolveTmpDirToMount').resolves({});

    sandbox.stub(docker, 'showDebugIdeTipsForVscode').resolves({});
    sandbox.stub(docker, 'showDebugIdeTipsForPycharm').resolves({});

    Invoke = proxyquire('../../lib/local/invoke', {
      '../docker': docker
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test does nothing1', async () => {
    const invoke = new Invoke(serviceName,
      serviceResWithNasConfig,
      functionName,
      functionRes,
      null,
      debugIde,
      baseDir);

    await invoke.showDebugIdeTips();

    assert.notCalled(docker.showDebugIdeTipsForVscode);
  });

  it('test does nothing2', async () => {
    const invoke = new Invoke(serviceName,
      serviceResWithNasConfig,
      functionName,
      functionRes,
      debugPort,
      null,
      baseDir);

    await invoke.showDebugIdeTips();

    assert.notCalled(docker.showDebugIdeTipsForVscode);
  });


  it('test does nothing3', async () => {
    const invoke = new Invoke(serviceName,
      serviceResWithNasConfig,
      functionName,
      functionRes,
      null,
      null,
      baseDir);

    await invoke.showDebugIdeTips();

    assert.notCalled(docker.showDebugIdeTipsForVscode);
  });

  it('test show vscode debug tips', async () => {
    const invoke = new Invoke(serviceName,
      serviceResWithNasConfig,
      functionName,
      functionRes,
      debugPort,
      debugIde,
      baseDir);

    await invoke.init();
    
    await invoke.showDebugIdeTips();
    
    assert.calledWith(docker.showDebugIdeTipsForVscode, 
      serviceName, 
      functionName,
      'python3', 
      '.', 
      debugPort);
  });

  it('test show pycharm debug tips', async () => {
    const invoke = new Invoke(serviceName,
      serviceResWithNasConfig,
      functionName,
      functionRes,
      debugPort,
      'pycharm',
      baseDir);

    await invoke.init();
    
    await invoke.showDebugIdeTips();
    
    assert.calledWith(docker.showDebugIdeTipsForPycharm, 
      '.', 
      debugPort);
  });
});