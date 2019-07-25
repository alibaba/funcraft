'use strict';

const expect = require('expect.js');

let dockerOpts = require('../lib/docker-opts');
const { setProcess } = require('./test-utils');
const os = require('os');
const DockerCli = require('dockerode');
const sinon = require('sinon');
const assert = sinon.assert;
const sandbox = sinon.createSandbox();
const proxyquire = require('proxyquire');

describe('test resolveRuntimeToDockerImage', () => {
  it('test find not python image', () => {
    for (let runtime of ['nodejs6', 'nodejs8', 'python2.7', 'java8', 'php7.2']) {
      const imageName = dockerOpts.resolveRuntimeToDockerImage(runtime);
      expect(imageName).to.contain(`aliyunfc/runtime-${runtime}:`);
    }
  });

  it('test find python 3 image', () => {
    const imageName = dockerOpts.resolveRuntimeToDockerImage('python3');
    expect(imageName).to.contain(`aliyunfc/runtime-python3.6:`);
  });
});

describe('test generateLocalInvokeOpts', () => {
  let restoreProcess;

  beforeEach(() => {

    sandbox.stub(DockerCli.prototype, 'info').resolves({});

    dockerOpts = proxyquire('../lib/docker-opts', {
      'dockerode': DockerCli
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
  });

  it('test generate docker opts', async () => {
    const envs = {
      'local': true,
      'FC_ACCESS_KEY_ID': 'testKeyId',
      'FC_ACCESS_KEY_SECRET': 'testKeySecret',
      'DEBUG_OPTIONS': '--inspect-brk=0.0.0.0:9000'
    };

    const opts = await dockerOpts.generateLocalInvokeOpts('nodejs8', 'test', [{
      Type: 'bind',
      Source: '/test',
      Target: '/code',
      ReadOnly: true
    }], 'cmd', 9000, envs, '1000:1000');

    assert.calledOnce(DockerCli.prototype.info);

    expect(opts).to.eql({
      'name': 'test',
      'Cmd': 'cmd',
      'User': '1000:1000',
      'Env': [
        'local=true',
        'FC_ACCESS_KEY_ID=testKeyId',
        'FC_ACCESS_KEY_SECRET=testKeySecret',
        'DEBUG_OPTIONS=--inspect-brk=0.0.0.0:9000',
        'LD_LIBRARY_PATH=/code/.fun/root/usr/lib:/code/.fun/root/usr/lib/x86_64-linux-gnu:/code:/code/lib:/usr/local/lib',
        'PATH=/code/.fun/root/usr/local/bin:/code/.fun/root/usr/local/sbin:/code/.fun/root/usr/bin:/code/.fun/root/usr/sbin:/code/.fun/root/sbin:/code/.fun/root/bin:/code/.fun/python/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/sbin:/bin',
        'PYTHONUSERBASE=/code/.fun/python'
      ],
      'AttachStderr': true,
      'AttachStdin': true,
      'AttachStdout': true,
      'OpenStdin': true,
      'StdinOnce': true,
      'Tty': false,
      'Image': 'aliyunfc/runtime-nodejs8:1.5.5',
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
    const opts = await dockerOpts.generateLocalInvokeOpts('nodejs8', 'test', [{
      Type: 'bind',
      Source: '/test',
      Target: '/code',
      ReadOnly: true
    }], null, null, null, null);

    assert.calledOnce(DockerCli.prototype.info);

    expect(opts).to.eql({
      'name': 'test',
      'Cmd': null,
      'AttachStderr': true,
      'AttachStdin': true,
      'AttachStdout': true,
      'OpenStdin': true,
      'StdinOnce': true,
      'Tty': false,
      'User': null,
      'Image': 'aliyunfc/runtime-nodejs8:1.5.5',
      'Env': [
        'LD_LIBRARY_PATH=/code/.fun/root/usr/lib:/code/.fun/root/usr/lib/x86_64-linux-gnu:/code:/code/lib:/usr/local/lib',
        'PATH=/code/.fun/root/usr/local/bin:/code/.fun/root/usr/local/sbin:/code/.fun/root/usr/bin:/code/.fun/root/usr/sbin:/code/.fun/root/sbin:/code/.fun/root/bin:/code/.fun/python/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/sbin:/bin',
        'PYTHONUSERBASE=/code/.fun/python'
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

describe('test resolveDockerEnv', () => {
  it('test empty', () => {
    const envs = [];
    const resolved = dockerOpts.resolveDockerEnv(envs);

    expect(resolved).to.eql([
      'LD_LIBRARY_PATH=/code/.fun/root/usr/lib:/code/.fun/root/usr/lib/x86_64-linux-gnu:/code:/code/lib:/usr/local/lib',
      'PATH=/code/.fun/root/usr/local/bin:/code/.fun/root/usr/local/sbin:/code/.fun/root/usr/bin:/code/.fun/root/usr/sbin:/code/.fun/root/sbin:/code/.fun/root/bin:/code/.fun/python/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/sbin:/bin',
      'PYTHONUSERBASE=/code/.fun/python'
    ]);
  });

  it('test one env', () => {
    const envs = { 'key': 'value' };

    const resolved = dockerOpts.resolveDockerEnv(envs);

    expect(resolved).to.eql([
      'key=value',
      'LD_LIBRARY_PATH=/code/.fun/root/usr/lib:/code/.fun/root/usr/lib/x86_64-linux-gnu:/code:/code/lib:/usr/local/lib',
      'PATH=/code/.fun/root/usr/local/bin:/code/.fun/root/usr/local/sbin:/code/.fun/root/usr/bin:/code/.fun/root/usr/sbin:/code/.fun/root/sbin:/code/.fun/root/bin:/code/.fun/python/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/sbin:/bin',
      'PYTHONUSERBASE=/code/.fun/python'
    ]);
  });

  it('test two env', () => {
    const envs = { 'key1': 'value1', 'key2': 'value2' };

    const resolved = dockerOpts.resolveDockerEnv(envs);

    expect(resolved).to.eql([
      'key1=value1', 
      'key2=value2',
      'LD_LIBRARY_PATH=/code/.fun/root/usr/lib:/code/.fun/root/usr/lib/x86_64-linux-gnu:/code:/code/lib:/usr/local/lib',
      'PATH=/code/.fun/root/usr/local/bin:/code/.fun/root/usr/local/sbin:/code/.fun/root/usr/bin:/code/.fun/root/usr/sbin:/code/.fun/root/sbin:/code/.fun/root/bin:/code/.fun/python/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/sbin:/bin',
      'PYTHONUSERBASE=/code/.fun/python'
    ]);
  });
});

describe('test pathTransformationToVirtualBox', () => {
  it('test default host machine path', async () => {
    if (process.platform === 'win32') {
      const source = 'C:\\Users\\WB-SFY~1\\AppData\\Local\\Temp';
      const result = await dockerOpts.pathTransformationToVirtualBox(source);
      expect(result).to.eql('/c/Users/WB-SFY~1/AppData/Local/Temp');
    }
  });
});