'use strict';

const expect = require('expect.js');

let docker = require('../lib/docker');

const os = require('os');

const DockerCli = require('dockerode');

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const { setProcess } = require('./test-utils');

const util = require('util');
const path = require('path');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('test generateDockerCmd', () => {
  const functionProps = {
    'Handler': 'index.handler',
    'CodeUri': 'python3',
    'Initializer': 'index.initializer',
    'Description': 'Hello world with python3!',
    'Runtime': 'python3'
  };

  it('test generate docker cmd', () => {

    const cmd = docker.generateDockerCmd(functionProps, false);

    expect(cmd).to.eql([
      '-h',
      'index.handler',
      '--stdin',
      '-i',
      'index.initializer'
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
      'index.initializer'
    ]);
  });
});

describe('test resolveRuntimeToDockerImage', () => {
  it('test find not python image', () => {
    for (let runtime of ['nodejs6', 'nodejs8', 'python2.7', 'java8', 'php7.2']) {
      const imageName = docker.resolveRuntimeToDockerImage(runtime);
      expect(imageName).to.contain(`aliyunfc/runtime-${runtime}:`);
    }
  });

  it('test find python 3 image', () => {
    const imageName = docker.resolveRuntimeToDockerImage('python3');
    expect(imageName).to.contain(`aliyunfc/runtime-python3.6:`);
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

describe('test resolveCodeUriToMount', () => {

  // windows will resolve /dir to c:\dir
  const dirPath = path.resolve('/dir');

  const jarPath = path.resolve('/dir/jar');

  beforeEach(() => {

    const lstat = sandbox.stub();

    lstat.withArgs(dirPath).resolves({
      isDirectory: function () { return true; }
    });

    lstat.withArgs(jarPath).resolves({
      isDirectory: function () { return false; }
    });

    sandbox.stub(path, 'basename').returns('jar');

    sandbox.stub(util, 'promisify').returns(lstat);

    docker = proxyquire('../lib/docker', {
      'util': util,
      'path': path
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test resolve code uri', async () => {

    const mount = await docker.resolveCodeUriToMount(dirPath);

    expect(mount).to.eql({
      Type: 'bind',
      Source: dirPath,
      Target: '/code',
      ReadOnly: true
    });
  });

  it('test resolve jar code uri', async () => {

    const mount = await docker.resolveCodeUriToMount(jarPath);

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
    expect(envs).to.eql([
      'TestKey1=TestValue1',
      'TestKey2=TestValue2'
    ]);
  });

  it('test generate empty function env', () => {
    const functionProps = {};

    const envs = docker.generateFunctionEnvs(functionProps);
    expect(envs).to.eql([]);
  });
});

describe('test generateDockerOpts', () => {
  let restoreProcess;

  beforeEach(() => {

    restoreProcess = setProcess({
      HOME: os.tmpdir(),
      ACCOUNT_ID: 'testAccountId',
      ACCESS_KEY_ID: 'testKeyId',
      ACCESS_KEY_SECRET: 'testKeySecret',
    });
  });

  afterEach(() => {
    restoreProcess();
  });

  it('test generate docker opts', async () => {
    const envs = ['local=true',
      'FC_ACCESS_KEY_ID=testKeyId',
      'FC_ACCESS_KEY_SECRET=testKeySecret',
      'DEBUG_OPTIONS=--inspect-brk=0.0.0.0:9000'];

    const opts = await docker.generateDockerOpts('nodejs8', 'test', [{
      Type: 'bind',
      Source: '/test',
      Target: '/code',
      ReadOnly: true
    }], 'cmd', 9000, envs, '1000:1000');

    expect(opts).to.eql({
      'name': 'test',
      'Cmd': 'cmd',
      'User': '1000:1000',
      'Env': [
        'local=true',
        'FC_ACCESS_KEY_ID=testKeyId',
        'FC_ACCESS_KEY_SECRET=testKeySecret',
        'DEBUG_OPTIONS=--inspect-brk=0.0.0.0:9000'
      ],
      'AttachStderr': true,
      'AttachStdin': true,
      'AttachStdout': true,
      'OpenStdin': true,
      'StdinOnce': true,
      'Tty': false,
      'Image': 'aliyunfc/runtime-nodejs8:1.2.0',
      'HostConfig': {
        'AutoRemove': true,
        'Mounts': [
          {
            'Type': 'bind',
            'Source': '/test',
            'Target': '/code',
            'ReadOnly': true
          }
        ],
        'PortBindings': {
          '9000/tcp': [
            {
              'HostIp': '',
              'HostPort': '9000'
            }
          ]
        }
      },
      'ExposedPorts': {
        '9000/tcp': {}
      }
    });
  });

  it('test generate docker opts without debug port', async () => {
    const opts = await docker.generateDockerOpts('nodejs8', 'test', [{
      Type: 'bind',
      Source: '/test',
      Target: '/code',
      ReadOnly: true
    }], null, null, null, null);

    expect(opts).to.eql({
      'name': 'test',
      'Env': null,
      'Cmd': null,
      'AttachStderr': true,
      'AttachStdin': true,
      'AttachStdout': true,
      'OpenStdin': true,
      'StdinOnce': true,
      'Tty': false,
      'User': null,
      'Image': 'aliyunfc/runtime-nodejs8:1.2.0',
      'HostConfig': {
        'AutoRemove': true,
        'Mounts': [
          {
            'Type': 'bind',
            'Source': '/test',
            'Target': '/code',
            'ReadOnly': true
          }
        ]
      }
    });
  });
});

describe('test generateRamdomContainerName', () => {
  it('test generate', () => {
    const containerName = docker.generateRamdomContainerName();
    expect(containerName).to.contain('fun_local_');
  });
});

describe('test resolveNasConfigToMount', () => {
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
  
    const mount = await docker.resolveNasConfigToMount(nasConfig, path.posix.join(projectDir, 'template.yml'));

    expect(mount).to.eql({
      Type: 'bind',
      Source: path.join(projectDir, '.fun', 'nas', '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com/'),
      Target: '/mnt/test',
      ReadOnly: false
    });
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
      await docker.resolveNasConfigToMount(nasConfig, path.posix.join(projectDir, 'template.yml'));
    } catch(e) {
      expect(e).to.be.an(Error);
    }
  });
  
  it('test empty nas config', async () => {
    const mount = await docker.resolveNasConfigToMount(null, null);
  
    expect(mount).to.be(null);
  });
});

describe('test docker run', async () => {

  let restoreProcess;
  let containerMock;
  let streamMock;

  beforeEach(() => {

    sandbox.stub(DockerCli.prototype, 'pull').resolves({});
    sandbox.stub(DockerCli.prototype, 'run').resolves({});
    sandbox.stub(DockerCli.prototype, 'getContainer').returns({ 'stop': sandbox.stub() });

    streamMock = {
      'write': sandbox.stub(),
      'end': sandbox.stub()
    };

    let containerAttachStub = sandbox.stub().resolves(streamMock);

    containerMock = {
      'attach': containerAttachStub,
      'modem': {
        'demuxStream': sandbox.stub()
      },
      'start': sandbox.stub(),
      'wait': sandbox.stub()
    };

    sandbox.stub(DockerCli.prototype, 'createContainer').resolves(containerMock);

    docker = proxyquire('../lib/docker', {
      'dockerode': DockerCli
    });

    restoreProcess = setProcess({
      HOME: os.tmpdir(),
      ACCOUNT_ID: 'testAccountId',
      ACCESS_KEY_ID: 'testKeyId',
      ACCESS_KEY_SECRET: 'testKeySecret',
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
    await docker.run({}, 'test_container_name', 'event', process.stdout, process.stderr);

    assert.calledWith(DockerCli.prototype.createContainer, {});

    assert.calledWith(containerMock.attach, {
      hijack: true,
      stderr: true,
      stdin: true,
      stdout: true,
      stream: true
    });

    assert.calledWith(containerMock.modem.demuxStream,
      streamMock,
      process.stdout,
      process.stderr);

    assert.calledOnce(containerMock.start);

    assert.calledWith(streamMock.write, 'event');

    assert.calledOnce(streamMock.end);

    assert.calledOnce(containerMock.wait);
  });

  it('test cancel invoke function', async () => {

    containerMock.wait = sandbox.stub().callsFake(async () => {
      return await sleep(1000);
    });

    docker.run({}, 'test', 'event', process.stdout, process.stderr);

    await sleep(100);

    assert.calledWith(DockerCli.prototype.createContainer, {});

    assert.calledWith(containerMock.attach, {
      hijack: true,
      stderr: true,
      stdin: true,
      stdout: true,
      stream: true
    });

    assert.calledWith(containerMock.modem.demuxStream,
      streamMock,
      process.stdout,
      process.stderr);

    assert.calledOnce(containerMock.start);

    assert.calledWith(streamMock.write, 'event');

    assert.calledOnce(streamMock.end);

    assert.calledOnce(containerMock.wait);

    // process.kill(process.pid, 'SIGINT'); // will kill program directly on windows
    process.emit('SIGINT');

    await sleep(10);

    assert.calledWith(DockerCli.prototype.getContainer, sinon.match.string);
    assert.calledOnce(DockerCli.prototype.getContainer().stop);
  });
});