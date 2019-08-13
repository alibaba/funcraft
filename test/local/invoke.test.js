'use strict';

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
  debugPort, debugIde, tplPath, codeMount,
  nasMounts } = require('./mock-data');

describe('test invoke construct and init', async () => {

  beforeEach(() => {

    sandbox.stub(docker, 'resolveCodeUriToMount').resolves(codeMount);
    sandbox.stub(docker, 'pullImageIfNeed').resolves({});
    sandbox.stub(dockerOpts, 'resolveRuntimeToDockerImage').resolves('aliyunfc/runtime-python3.6:1.5.7');

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
    expect(invoke.tplPath).to.eql(tplPath);

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
      tplPath);

    expectConstructConfigs(invoke);
  });

  it('test init', async () => {

    const invoke = new Invoke(serviceName,
      serviceRes,
      functionName,
      functionRes,
      debugPort,
      debugIde,
      tplPath);

    await invoke.init();

    expect(invoke.nasConfig).to.eql(undefined);
    expect(invoke.dockerUser).to.eql('10003:10003');
    expect(invoke.nasMounts).to.eql([]);
    expect(invoke.codeMount).to.eql(codeMount);
    expect(invoke.mounts).to.eql([codeMount]);
    expect(invoke.containerName).to.contain('fun_local_');
    expect(invoke.imageName).to.contain('aliyunfc/runtime-python3.6:1.5.7');

    assert.calledWith(docker.pullImageIfNeed, 'aliyunfc/runtime-python3.6:1.5.7');
  });

  it('test init with nas config', async () => {

    const invoke = new Invoke(serviceName,
      serviceResWithNasConfig,
      functionName,
      functionRes,
      debugPort,
      debugIde,
      tplPath);

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
    expect(invoke.mounts).to.eql([codeMount, ...nasMounts]);
    expect(invoke.containerName).to.contain('fun_local_');
    expect(invoke.imageName).to.eql('aliyunfc/runtime-python3.6:1.5.7');

    assert.calledWith(docker.pullImageIfNeed, 'aliyunfc/runtime-python3.6:1.5.7');
  });
});

describe('test showDebugIdeTips', async () => {

  beforeEach(() => {

    sandbox.stub(docker, 'resolveCodeUriToMount').resolves(codeMount);
    sandbox.stub(docker, 'pullImageIfNeed').resolves({});

    sandbox.stub(docker, 'showDebugIdeTips').resolves({});

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
      tplPath);

    await invoke.showDebugIdeTips();
    
    assert.notCalled(docker.showDebugIdeTips);
  });

  it('test does nothing2', async () => {
    const invoke = new Invoke(serviceName,
      serviceResWithNasConfig,
      functionName,
      functionRes,
      debugPort,
      null,
      tplPath);

    await invoke.showDebugIdeTips();
    
    assert.notCalled(docker.showDebugIdeTips);
  });


  it('test does nothing3', async () => {
    const invoke = new Invoke(serviceName,
      serviceResWithNasConfig,
      functionName,
      functionRes,
      null,
      null,
      tplPath);

    await invoke.showDebugIdeTips();
    
    assert.notCalled(docker.showDebugIdeTips);
  });

  it('test show debug ide tips', async () => {
    const invoke = new Invoke(serviceName,
      serviceResWithNasConfig,
      functionName,
      functionRes,
      debugPort,
      debugIde,
      tplPath);

    await invoke.init();
    
    await invoke.showDebugIdeTips();
    
    assert.calledWith(docker.showDebugIdeTips, 
      serviceName, 
      functionName,
      'python3', 
      '.', 
      debugPort);
  });

});
