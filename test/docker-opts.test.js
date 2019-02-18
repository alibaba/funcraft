'use strict';

const expect = require('expect.js');

const dockerOpts = require('../lib/docker-opts');
const { setProcess } = require('./test-utils');
const os = require('os');

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

    const opts = await dockerOpts.generateLocalInvokeOpts('nodejs8', 'test', [{
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
      'Image': 'aliyunfc/runtime-nodejs8:1.5.0',
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
      'Image': 'aliyunfc/runtime-nodejs8:1.5.0',
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