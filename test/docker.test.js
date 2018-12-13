'use strict';

const expect = require('expect.js');

let docker = require('../lib/docker');

const os = require('os');

const DockerCli = require('dockerode');

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const util = require('util');
const path = require('path');

var prevHome;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('test generateDockerCmd', () => {
  it('test generate docker cmd', () => {
    const functionProps = {
      'Handler': 'index.handler',
      'CodeUri': 'python3',
      'Initializer': 'index.initializer',
      'Description': 'Hello world with python3!',
      'Runtime': 'python3'
    };

    const cmd = docker.generateDockerCmd(functionProps, '{"testKey":"testValue"}');

    expect(cmd).to.eql([
      '-h',
      'index.handler',
      '--event',
      '{"testKey":"testValue"}',
      '-i',
      'index.initializer'
    ]);
  });
});

describe('test findDockerImage', () => {
  it('test find not python image', () => {
    for (let runtime of ['nodejs6', 'nodejs8', 'python2.7', 'java8', 'php7.2']) {
      const imageName = docker.findDockerImage(runtime);
      expect(imageName).to.contain(`aliyunfc/runtime-${runtime}:`);
    }
  });

  it('test find python 3 image', () => {
    const imageName = docker.findDockerImage('python3');
    expect(imageName).to.contain(`aliyunfc/runtime-python3.6:`);
  });
});

describe('test resolveCodeUriToMount', () => {

  // windows will resolve /dir to c:\dir
  const dirPath = path.resolve('/dir');
  
  const jarPath = path.resolve('/dir/jar');

  beforeEach(() => {
    
    const lstat = sandbox.stub();
    
    lstat.withArgs(dirPath).resolves({
      isDirectory: function() {return true;}
    });

    lstat.withArgs(jarPath).resolves({
      isDirectory: function() {return false;}
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

describe('test generateFunctionEnv', () => {
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
  const functionProps = {
    'Handler': 'index.handler',
    'CodeUri': 'python3',
    'Initializer': 'index.initializer',
    'Description': 'Hello world with python3!',
    'Runtime': 'python3'
  };

  beforeEach(() => {
    prevHome = os.homedir();
    process.env.HOME = os.tmpdir();
    process.env.ACCOUNT_ID = 'testAccountId';
    process.env.ACCESS_KEY_ID = 'testKeyId';
    process.env.ACCESS_KEY_SECRET = 'testKeySecret';
  });

  afterEach(() => {
    process.env.HOME = prevHome;
    delete process.env.ACCOUNT_ID;
    delete process.env.ACCESS_KEY_ID;
    delete process.env.ACCESS_KEY_SECRET;
    delete process.env.DEFAULT_REGION;
    delete process.env.TIMEOUT;
    delete process.env.RETRIES;
  });

  it('test generate docker opts', async () => {
    const opts = await docker.generateDockerOpts(functionProps, 'nodejs8', 'test', {
      Type: 'bind',
      Source: '/test',
      Target: '/code',
      ReadOnly: true
    }, 9000);

    expect(opts).to.eql({
      name: 'test',
      'Env': [
        'local=true',
        'FC_ACCESS_KEY_ID=testKeyId',
        'FC_ACCESS_KEY_SECRET=testKeySecret',
        'DEBUG_OPTIONS=--inspect-brk=0.0.0.0:9000'
      ],
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
    const opts = await docker.generateDockerOpts(functionProps, 'nodejs8', 'test', {
      Type: 'bind',
      Source: '/test',
      Target: '/code',
      ReadOnly: true
    }, null);

    expect(opts).to.eql({
      'name': 'test',
      'Env': [
        'local=true',
        'FC_ACCESS_KEY_ID=testKeyId',
        'FC_ACCESS_KEY_SECRET=testKeySecret'
      ],
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

describe('test invokeFunction', async () => {
  const codeDir = os.tmpdir();

  const functionProps = {
    'Properties': {
      'Handler': 'index.handler',
      'CodeUri': codeDir,
      'Initializer': 'index.initializer',
      'Description': 'Hello world with python3!',
      'Runtime': 'python3'
    }
  };

  beforeEach(() => {
    sandbox.stub(DockerCli.prototype, 'listImages').resolves({
      length: 1
    });

    sandbox.stub(DockerCli.prototype, 'pull').resolves({});
    sandbox.stub(DockerCli.prototype, 'run').resolves({});
    sandbox.stub(DockerCli.prototype, 'getContainer').returns({'stop': sandbox.stub()});

    docker = proxyquire('../lib/docker', {
      'dockerode': DockerCli
    });

    prevHome = os.homedir();
    process.env.HOME = os.tmpdir();
    process.env.ACCOUNT_ID = 'testAccountId';
    process.env.ACCESS_KEY_ID = 'testKeyId';
    process.env.ACCESS_KEY_SECRET = 'testKeySecret';
  });

  afterEach(() => {
    sandbox.restore();

    process.env.HOME = prevHome;
    delete process.env.ACCOUNT_ID;
    delete process.env.ACCESS_KEY_ID;
    delete process.env.ACCESS_KEY_SECRET;
    delete process.env.DEFAULT_REGION;
    delete process.env.TIMEOUT;
    delete process.env.RETRIES;

    // https://stackoverflow.com/questions/40905239/how-write-tests-for-checking-behaviour-during-graceful-shutdown-in-node-js/40909092#40909092
    // avoid test exit code not 0
    process.removeAllListeners('SIGINT');
  });

  it('test invoke function without debug and event', async () => {
    await docker.invokeFunction('test', 'test', functionProps, null, null);

    assert.notCalled(DockerCli.prototype.pull);
    assert.calledOnce(DockerCli.prototype.listImages);

    assert.calledWith(DockerCli.prototype.run,
      'aliyunfc/runtime-python3.6:1.1.0',
      ['-h', 'index.handler', '-i', 'index.initializer'],
      process.stdout,
      {
        name: sinon.match.string,
        Env: ['local=true', 'FC_ACCESS_KEY_ID=testKeyId', 'FC_ACCESS_KEY_SECRET=testKeySecret'],
        HostConfig: {
          AutoRemove: true,
          Mounts: [{ Source: codeDir, Target: '/code', Type: 'bind', ReadOnly: true }]
        }
      });
  });

  it('test invoke function with debug and without event', async () => {
    await docker.invokeFunction('test', 'test', functionProps, 9000, null);

    assert.notCalled(DockerCli.prototype.pull);
    assert.calledOnce(DockerCli.prototype.listImages);

    assert.calledWith(DockerCli.prototype.run,
      'aliyunfc/runtime-python3.6:1.1.0',
      ['-h', 'index.handler', '-i', 'index.initializer'],
      process.stdout,
      {
        name: sinon.match.string,
        Env: ['local=true', 'FC_ACCESS_KEY_ID=testKeyId', 'FC_ACCESS_KEY_SECRET=testKeySecret', 'DEBUG_OPTIONS=-m ptvsd --host 0.0.0.0 --port 9000 --wait'],
        ExposedPorts: { '9000/tcp': {} },
        HostConfig: {
          AutoRemove: true,
          Mounts: [{ Source: codeDir, Target: '/code', Type: 'bind', ReadOnly: true }],
          PortBindings: { '9000/tcp': [{ HostIp: '', HostPort: '9000' }] }
        }
      });
  });

  it('test invoke function with debug and event', async () => {
    await docker.invokeFunction('test', 'test', functionProps, 9000, '{"testKey": "testValue"}');

    assert.notCalled(DockerCli.prototype.pull);
    assert.calledOnce(DockerCli.prototype.listImages);

    assert.calledWith(DockerCli.prototype.run,
      'aliyunfc/runtime-python3.6:1.1.0',
      ['-h', 'index.handler', '--event', '{"testKey": "testValue"}', '-i', 'index.initializer'],
      process.stdout,
      {
        name: sinon.match.string,
        Env: ['local=true', 'FC_ACCESS_KEY_ID=testKeyId', 'FC_ACCESS_KEY_SECRET=testKeySecret', 'DEBUG_OPTIONS=-m ptvsd --host 0.0.0.0 --port 9000 --wait'],
        ExposedPorts: { '9000/tcp': {} },
        HostConfig: {
          AutoRemove: true,
          Mounts: [{ Source: codeDir, Target: '/code', Type: 'bind', ReadOnly: true }],
          PortBindings: { '9000/tcp': [{ HostIp: '', HostPort: '9000' }] }
        }
      });
  });

  it('test cancel invoke function', async () => {

    DockerCli.prototype.run.restore();
    sandbox.stub(DockerCli.prototype, 'run').callsFake(async () => {
      return await sleep(100);
    });

    docker.invokeFunction('test', 'test', functionProps, 9000, '{"testKey": "testValue"}');

    await sleep(10);

    assert.notCalled(DockerCli.prototype.pull);
    assert.calledOnce(DockerCli.prototype.listImages);
  
    assert.calledWith(DockerCli.prototype.run,
      'aliyunfc/runtime-python3.6:1.1.0',
      ['-h', 'index.handler', '--event', '{"testKey": "testValue"}', '-i', 'index.initializer'],
      process.stdout,
      {
        name: sinon.match.string,
        Env: ['local=true', 'FC_ACCESS_KEY_ID=testKeyId', 'FC_ACCESS_KEY_SECRET=testKeySecret', 'DEBUG_OPTIONS=-m ptvsd --host 0.0.0.0 --port 9000 --wait'],
        ExposedPorts: { '9000/tcp': {} },
        HostConfig: {
          AutoRemove: true,
          Mounts: [{ Source: codeDir, Target: '/code', Type: 'bind', ReadOnly: true }],
          PortBindings: { '9000/tcp': [{ HostIp: '', HostPort: '9000' }] }
        }
      });
    
    // process.kill(process.pid, 'SIGINT'); // will kill program directly on windows
    process.emit('SIGINT');

    await sleep(10);

    assert.calledWith(DockerCli.prototype.getContainer, sinon.match.string);
    assert.calledOnce(DockerCli.prototype.getContainer().stop);
  });
});
