'use strict';

const os = require('os');
const fs = require('fs-extra');
const path = require('path');

let docker = require('../lib/docker');
const DockerCli = require('dockerode');
const DockerModem = require('docker-modem');
const dockerOpts = require('../lib/docker-opts');

const sinon = require('sinon');
const assert = sinon.assert;
const sandbox = sinon.createSandbox();
const expect = require('expect.js');
const proxyquire = require('proxyquire');

const { sleep } = require('../lib/time');
const { setProcess } = require('./test-utils');
const { hasDocker } = require('./conditions');
const { DEFAULT_NAS_PATH_SUFFIX } = require('../lib/tpl');

const baseDir = path.resolve('/');
const tempDir = require('temp-dir');

describe('test generateDockerCmd', () => {
  const functionProps = {
    'Handler': 'index.handler',
    'CodeUri': 'python3',
    'Initializer': 'index.initializer',
    'Description': 'Hello world with python3!',
    'Runtime': 'python3',
    'InitializationTimeout': 3
  };

  it('test generate docker cmd', () => {

    const cmd = docker.generateDockerCmd(functionProps, false);

    expect(cmd).to.eql([
      '-h',
      'index.handler',
      '--stdin',
      '-i',
      'index.initializer',
      '--initializationTimeout',
      '3'
    ]);
  });

  it('test generate docker cmd with event', () => {

    const cmd = docker.generateDockerCmd(functionProps, false, true, 'event');

    expect(cmd).to.eql([
      '-h',
      'index.handler',
      '--event',
      'ZXZlbnQ=',
      '--event-decode',
      '-i',
      'index.initializer',
      '--initializationTimeout',
      '3'
    ]);
  });

  it('test generate docker http cmd', () => {
    const cmd = docker.generateDockerCmd(functionProps, true);

    expect(cmd).to.eql([
      '-h',
      'index.handler',
      '--stdin',
      '--http',
      '-i',
      'index.initializer',
      '--initializationTimeout',
      '3'
    ]);
  });

  it('test generate docker http cmd without initializer', () => {
    const cmd = docker.generateDockerCmd(functionProps, true, false);

    expect(cmd).to.eql([
      '-h',
      'index.handler',
      '--stdin',
      '--http',
      '--initializationTimeout',
      '3'
    ]);
  });
});

describe('test imageExist', async () => {

  beforeEach(() => {
    const listImagesStub = sandbox.stub(DockerCli.prototype, 'listImages');

    listImagesStub.withArgs({
      filters: {
        reference: ['test']
      }
    }).resolves({ length: 1 });

    listImagesStub.withArgs({
      filters: {
        reference: ['test not exist']
      }
    }).resolves({ length: 0 });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test image exist', async () => {
    const exist = await docker.imageExist('test');
    expect(exist).to.be(true);

    assert.calledOnce(DockerCli.prototype.listImages);
  });

  it('test image not exist', async () => {
    const exist = await docker.imageExist('test not exist');
    expect(exist).to.be(false);

    assert.calledOnce(DockerCli.prototype.listImages);
  });
});

describe('test resolveTmpDirToMount', () => {

  it('test resolve tmp dir', async () => {

    const mount = await docker.resolveTmpDirToMount('/tmp');

    expect(mount).to.eql({
      Type: 'bind',
      Source: '/tmp',
      Target: '/tmp',
      ReadOnly: false
    });
  });

  it('test tmp dir is empty', async () => {

    const mount = await docker.resolveTmpDirToMount();
    expect(mount).to.eql({});
  });
});

describe('test resolveCodeUriToMount', () => {

  // windows will resolve /dir to c:\dir
  const dirPath = path.resolve('/dir');

  const jarPath = path.resolve('/dir/jar');

  beforeEach(() => {

    const lstat = sandbox.stub(fs, 'lstat');

    lstat.withArgs(dirPath).resolves({
      isDirectory: function () { return true; }
    });

    lstat.withArgs(jarPath).resolves({
      isDirectory: function () { return false; }
    });

    sandbox.stub(path, 'basename').returns('jar');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test resolve code uri', async () => {

    const mount = await docker.resolveCodeUriToMount(path.resolve(baseDir, dirPath));

    expect(mount).to.eql({
      Type: 'bind',
      Source: dirPath,
      Target: '/code',
      ReadOnly: true
    });
  });

  it('test resolve jar code uri', async () => {

    const mount = await docker.resolveCodeUriToMount(path.resolve(baseDir, jarPath));

    expect(mount).to.eql({
      Type: 'bind',
      Source: jarPath,
      Target: '/code/jar',
      ReadOnly: true
    });
  });
});

describe('test generateFunctionEnvs', () => {
  it('test generate function env', () => {
    const functionProps = {
      'EnvironmentVariables': {
        'TestKey1': 'TestValue1',
        'TestKey2': 'TestValue2'
      }
    };

    const envs = docker.generateFunctionEnvs(functionProps);
    expect(envs).to.eql({
      'TestKey1': 'TestValue1',
      'TestKey2': 'TestValue2'
    });
  });

  it('test generate empty function env', () => {
    const functionProps = {};

    const envs = docker.generateFunctionEnvs(functionProps);
    expect(envs).to.eql([]);
  });
});

describe('test generateRamdomContainerName', () => {
  it('test generate', () => {
    const containerName = docker.generateRamdomContainerName();
    expect(containerName).to.contain('fun_local_');
  });
});

describe('test resolveNasConfigToMounts', () => {
  const projectDir = os.tmpdir();

  it('test resolve nas config', async () => {
    const nasConfig = {
      UserId: -1,
      GroupId: -1,
      MountPoints: [
        {
          ServerAddr: '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/',
          MountDir: '/mnt/test'
        }
      ]
    };

    const mount = await docker.resolveNasConfigToMounts('', nasConfig, path.join(projectDir, DEFAULT_NAS_PATH_SUFFIX));

    expect(mount).to.eql([{
      Type: 'bind',
      Source: path.join(projectDir, DEFAULT_NAS_PATH_SUFFIX, '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com/'),
      Target: '/mnt/test',
      ReadOnly: false
    }]);
  });

  it('test resolve nas config subDir not exist', async () => {
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

    try {
      await docker.resolveNasConfigToMounts(nasConfig, path.posix.join(projectDir, 'template.yml'));
    } catch (e) {
      expect(e).to.be.an(Error);
    }
  });

  it('test empty nas config', async () => {
    const mount = await docker.resolveNasConfigToMounts(null, null, null);

    expect(mount).to.eql([]);
  });

  it('test NasConfig: Auto', async () => {
    const nasConfig = 'Auto';

    const mount = await docker.resolveNasConfigToMounts('serviceName', nasConfig, path.join(projectDir, DEFAULT_NAS_PATH_SUFFIX));

    expect(mount).to.eql([{
      Type: 'bind',
      Source: path.join(projectDir, DEFAULT_NAS_PATH_SUFFIX, 'auto-default', 'serviceName'),
      Target: '/mnt/auto',
      ReadOnly: false
    }]);
  });
});

describe('test docker run', async () => {

  let restoreProcess;
  let containerMock;
  let streamMock;
  let logStreamMock;
  var isWin = process.platform === 'win32';
  let fcErrorTransformStub;
  let errorStream = {};

  beforeEach(() => {
    fcErrorTransformStub = sandbox.stub().returns(errorStream);

    sandbox.stub(DockerCli.prototype, 'pull').resolves({});
    sandbox.stub(DockerCli.prototype, 'run').resolves({});
    sandbox.stub(DockerCli.prototype, 'getContainer').returns({
      'stop': sandbox.stub(),
      'inspect': sandbox.stub().resolves({})
    });

    streamMock = {
      'write': sandbox.stub(),
      'end': sandbox.stub()
    };

    logStreamMock = {
      'write': sandbox.stub(),
      'end': sandbox.stub()
    };

    let containerAttachStub = sandbox.stub().resolves(streamMock);
    let containerLogsStub = sandbox.stub().resolves(logStreamMock);

    containerMock = {
      'id': 'containerId',
      'attach': containerAttachStub,
      'modem': {
        'demuxStream': sandbox.stub()
      },
      'start': sandbox.stub(),
      'wait': sandbox.stub(),
      'logs': containerLogsStub
    };

    sandbox.stub(DockerCli.prototype, 'createContainer').resolves(containerMock);

    docker = proxyquire('../lib/docker', {
      'dockerode': DockerCli,
      './fc-error-transform': fcErrorTransformStub
    });

    restoreProcess = setProcess({
      HOME: os.tmpdir(),
      ACCOUNT_ID: 'testAccountId',
      ACCESS_KEY_ID: 'testKeyId',
      ACCESS_KEY_SECRET: 'testKeySecret'
    });
  });

  afterEach(() => {
    sandbox.restore();

    restoreProcess();

    // https://stackoverflow.com/questions/40905239/how-write-tests-for-checking-behaviour-during-graceful-shutdown-in-node-js/40909092#40909092
    // avoid test exit code not 0
    process.removeAllListeners('SIGINT');
  });

  it('test run', async () => {
    await docker.run({}, 'event', process.stdout, process.stderr);

    assert.calledWith(DockerCli.prototype.createContainer, {});

    assert.calledWith(containerMock.attach, {
      hijack: true,
      stderr: true,
      stdin: true,
      stdout: true,
      stream: true
    });

    if (isWin) {
      assert.calledWith(containerMock.modem.demuxStream,
        logStreamMock,
        process.stdout,
        errorStream);
    } else {
      assert.calledWith(containerMock.modem.demuxStream,
        streamMock,
        process.stdout,
        errorStream);
    }

    assert.calledOnce(containerMock.start);
    assert.calledWith(streamMock.write, 'event');
    assert.calledOnce(streamMock.end);
    assert.calledOnce(containerMock.wait);
  });

  it('test cancel invoke function', async () => {
    containerMock.wait = sandbox.stub().callsFake(async () => {
      return await sleep(1000);
    });

    docker.run({}, 'event', process.stdout, process.stderr);

    await sleep(100);

    assert.calledWith(DockerCli.prototype.createContainer, {});

    assert.calledWith(containerMock.attach, {
      hijack: true,
      stderr: true,
      stdin: true,
      stdout: true,
      stream: true
    });

    if (isWin) {
      assert.calledWith(containerMock.modem.demuxStream,
        logStreamMock,
        process.stdout,
        errorStream);
    } else {
      assert.calledWith(containerMock.modem.demuxStream,
        streamMock,
        process.stdout,
        errorStream);
    }

    assert.calledOnce(containerMock.start);

    assert.calledWith(streamMock.write, 'event');

    assert.calledOnce(streamMock.end);

    assert.calledOnce(containerMock.wait);

    // process.kill(process.pid, 'SIGINT'); // will kill program directly on windows
    process.emit('SIGINT');

    await sleep(10);

    assert.calledWith(DockerCli.prototype.getContainer, 'containerId');
    assert.calledOnce(DockerCli.prototype.getContainer().inspect);
    assert.calledOnce(DockerCli.prototype.getContainer().stop);
  });
});

describe('Integration::InstallationContainer', async () => {

  beforeEach(() => {
    sandbox.stub(DockerCli.prototype, 'listImages').resolves({
      length: 1
    });

    docker = proxyquire('../lib/docker', {
      'dockerode': DockerCli
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  (hasDocker ? it : it.skip)('startInstallationContainer', async () => {
    const runner = await docker.startInstallationContainer({
      baseDir,
      runtime: 'python2.7',
      imageName: 'bitnami/minideb:jessie',
      codeUri: tempDir
    });

    await runner.stop();
  });

  (hasDocker ? it : it.skip)('exec installation container', async () => {
    const runner = await docker.startInstallationContainer({
      baseDir,
      runtime: 'python2.7',
      imageName: 'bitnami/minideb:jessie',
      codeUri: tempDir
    });

    await runner.exec(['/bin/bash', '-c', 'echo test $VAR'], {
      env: { 'VAR': 'sdfasdfasdf' }
    });

    await runner.stop();
  });
});

describe('test conventInstallTargetsToMounts', () => {
  it('test conventInstallTargetsToMounts', () => {
    const installTargets = [
      {
        hostPath: '.',
        containerPath: '/container'
      }
    ];

    const mounts = docker.conventInstallTargetsToMounts(installTargets);
    expect(mounts).to.eql([
      {
        Type: 'bind',
        Source: '.',
        ReadOnly: false,
        Target: '/container'
      }
    ]);
  });
});

describe('test isDockerToolBox', () => {

  var isWin = process.platform === 'win32';

  beforeEach(() => {

    sandbox.stub(DockerCli.prototype, 'info').resolves({ 'Labels': ['provider=virtualbox'] });
  });

  afterEach(() => {
    sandbox.restore();
  });

  (isWin ? it : it.skip)('test isDockerToolBox', async () => {

    const result = await docker.isDockerToolBoxAndEnsureDockerVersion();
    expect(result).to.be(true);
  });
});

describe('test resolveDebuggerPathToMount', () => {
  it('test resolveDebuggerPathToMount', async () => {
    const mount = await docker.resolveDebuggerPathToMount('/path');
    expect(mount).to.eql({
      Type: 'bind',
      Source: path.resolve('/path'),
      Target: '/tmp/debugger_files',
      ReadOnly: false
    });
  });
});

describe('#test rename images', () => {

  afterEach(() => {
    sandbox.restore();
  });

  it('test rename images', async () => {
    const dockerRegistry = 'registry.cn-beijing.aliyuncs.com';
    const resolveImageName = 'registry.cn-beijing.aliyuncs.com/aliyunfc/runtime-python2.7:1.6.8';
    const newImageName = 'aliyunfc/runtime-python2.7';
    const newTag = '1.6.8';

    const image = {
      tag: sandbox.stub()
    };

    sandbox.stub(DockerCli.prototype, 'pull');
    sandbox.stub(DockerCli.prototype, 'getImage').resolves(image);
    sandbox.stub(DockerModem.prototype, 'followProgress')
      .callsFake(function (stream, onFinished, onProgress) {
        onFinished(null);
      });

    sandbox.stub(dockerOpts, 'resolveImageNameForPull').returns(resolveImageName);
    sandbox.stub(dockerOpts, 'resolveDockerRegistry').returns(dockerRegistry);

    await docker.pullImage('aliyunfc/runtime-python2.7:1.6.8');

    assert.calledWith(image.tag, {
      name: resolveImageName,
      repo: newImageName,
      tag: newTag
    });
  });
});