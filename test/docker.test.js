'use strict';

const expect = require('expect.js');

let docker = require('../lib/docker');

const os = require('os');

const DockerCli = require('dockerode');

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

var prevHome;

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
      expect(imageName).to.be(`aliyunfc/runtime-${runtime}:latest`);
    }
  });

  it('test find python 3 image', () => {
    const imageName = docker.findDockerImage('python3');
    expect(imageName).to.be(`aliyunfc/runtime-python3.6:latest`);
  });
});

describe('test resolveCodeUriToMount', () => {

  it('test resolve code uri', async () => {

    const codeDir = os.tmpdir();

    const mount = await docker.resolveCodeUriToMount(codeDir);

    expect(mount).to.eql({
      Type: 'bind',
      Source: codeDir,
      Target: '/code'
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
    const opts = await docker.generateDockerOpts(functionProps, 'nodejs8', {
      Type: 'bind',
      Source: '/test',
      Target: '/code'
    }, 9000);

    expect(opts).to.eql({
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
            'Target': '/code'
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
    const opts = await docker.generateDockerOpts(functionProps, 'nodejs8', {
      Type: 'bind',
      Source: '/test',
      Target: '/code'
    }, null);

    expect(opts).to.eql({
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
            'Target': '/code'
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

    docker = proxyquire('../lib/docker', {
      'dockerode': DockerCli
    });

    prevHome = os.homedir();
    process.env.HOME = os.tmpdir();
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
  });

  it('test invoke function without debug and event', async () => {
    await docker.invokeFunction('test', 'test', functionProps, null, null);

    assert.notCalled(DockerCli.prototype.pull);
    assert.calledOnce(DockerCli.prototype.listImages);

    assert.calledWith(DockerCli.prototype.run,
      'aliyunfc/runtime-python3.6:latest',
      ['-h', 'index.handler', '-i', 'index.initializer'],
      process.stdout,
      {
        Env: ['local=true', 'FC_ACCESS_KEY_ID=testKeyId', 'FC_ACCESS_KEY_SECRET=testKeySecret'],
        HostConfig: {
          AutoRemove: true,
          Mounts: [{ Source: codeDir, Target: '/code', Type: 'bind' }]
        }
      });
  });

  it('test invoke function with debug and without event', async () => {
    await docker.invokeFunction('test', 'test', functionProps, 9000, null);

    assert.notCalled(DockerCli.prototype.pull);
    assert.calledOnce(DockerCli.prototype.listImages);

    assert.calledWith(DockerCli.prototype.run,
      'aliyunfc/runtime-python3.6:latest',
      ['-h', 'index.handler', '-i', 'index.initializer'],
      process.stdout,
      {
        Env: ['local=true', 'FC_ACCESS_KEY_ID=testKeyId', 'FC_ACCESS_KEY_SECRET=testKeySecret', 'DEBUG_OPTIONS=-m ptvsd --host 0.0.0.0 --port 9000 --wait'],
        ExposedPorts: { '9000/tcp': {} },
        HostConfig: {
          AutoRemove: true,
          Mounts: [{ Source: codeDir, Target: '/code', Type: 'bind' }],
          PortBindings: { '9000/tcp': [{ HostIp: '', HostPort: '9000' }] }
        }
      });
  });

  it('test invoke function with debug and event', async () => {
    await docker.invokeFunction('test', 'test', functionProps, 9000, '{"testKey": "testValue"}');

    assert.notCalled(DockerCli.prototype.pull);
    assert.calledOnce(DockerCli.prototype.listImages);

    assert.calledWith(DockerCli.prototype.run,
      'aliyunfc/runtime-python3.6:latest',
      ['-h', 'index.handler', '--event', '{"testKey": "testValue"}', '-i', 'index.initializer'],
      process.stdout,
      {
        Env: ['local=true', 'FC_ACCESS_KEY_ID=testKeyId', 'FC_ACCESS_KEY_SECRET=testKeySecret', 'DEBUG_OPTIONS=-m ptvsd --host 0.0.0.0 --port 9000 --wait'],
        ExposedPorts: { '9000/tcp': {} },
        HostConfig: {
          AutoRemove: true,
          Mounts: [{ Source: codeDir, Target: '/code', Type: 'bind' }],
          PortBindings: { '9000/tcp': [{ HostIp: '', HostPort: '9000' }] }
        }
      });
  });
});
