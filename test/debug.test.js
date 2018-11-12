'use strict';

//const path = require('path');
//const fs = require('fs');

const expect = require('expect.js');

const {
  generateVscodeDebugConfig, generateDebugEnv, generateDockerDebugOpts
} = require('../lib/debug');

const serviceName = 'testService';
const functionName = 'testFunction';

describe('test generateVscodeDebugConfig', () => {
  it('test python2.7', async function () {

    const debugConfig = await generateVscodeDebugConfig(serviceName, functionName, 'python2.7', '.', 9000);

    expect(debugConfig).to.eql({
      'version': '0.2.0',
      'configurations': [
        {
          'name': 'fc/testService/testFunction',
          'type': 'python',
          'request': 'attach',
          'host': 'localhost',
          'port': 9000,
          'pathMappings': [
            {
              'localRoot': '.',
              'remoteRoot': '/code'
            }
          ]
        }
      ]
    });
  });

  it('test python3', async function () {

    const debugConfig = await generateVscodeDebugConfig(serviceName, functionName, 'python3', '.', 9000);

    expect(debugConfig).to.eql({
      'version': '0.2.0',
      'configurations': [
        {
          'name': 'fc/testService/testFunction',
          'type': 'python',
          'request': 'attach',
          'host': 'localhost',
          'port': 9000,
          'pathMappings': [
            {
              'localRoot': '.',
              'remoteRoot': '/code'
            }
          ]
        }
      ]
    });
  });

  it('test nodejs6', async function () {

    const debugConfig = await generateVscodeDebugConfig(serviceName, functionName, 'nodejs6', '.', 9000);

    expect(debugConfig).to.eql({
      'version': '0.2.0',
      'configurations': [
        {
          'name': 'fc/testService/testFunction',
          'type': 'node',
          'request': 'attach',
          'address': 'localhost',
          'port': 9000,
          'localRoot': '.',
          'remoteRoot': '/code',
          'protocol': 'legacy',
          'stopOnEntry': false
        }
      ]
    });
  });

  it('test nodejs8', async function () {

    const debugConfig = await generateVscodeDebugConfig(serviceName, functionName, 'nodejs8', '.', 9000);

    expect(debugConfig).to.eql({
      'version': '0.2.0',
      'configurations': [
        {
          'name': 'fc/testService/testFunction',
          'type': 'node',
          'request': 'attach',
          'address': 'localhost',
          'port': 9000,
          'localRoot': '.',
          'remoteRoot': '/code',
          'protocol': 'inspect',
          'stopOnEntry': false
        }
      ]
    });
  });

  it('test java8', async function () {

    const debugConfig = await generateVscodeDebugConfig(serviceName, functionName, 'java8', '.', 9000);

    expect(debugConfig).to.eql({
      'version': '0.2.0',
      'configurations': [
        {
          'name': 'fc/testService/testFunction',
          'type': 'java',
          'request': 'attach',
          'hostName': 'localhost',
          'port': 9000
        }
      ]
    });
  });

  it('test php7.2', async function () {

    const debugConfig = await generateVscodeDebugConfig(serviceName, functionName, 'php7.2', '.', 9000);

    expect(debugConfig).to.eql({
      'version': '0.2.0',
      'configurations': [
        {
          'name': 'fc/testService/testFunction',
          'type': 'php',
          'request': 'launch',
          'port': 9000,
          'stopOnEntry': false,
          'pathMappings': {
            '/code': '.'
          },
          'ignore': [
            '/var/fc/runtime/**'
          ]
        }
      ]
    });
  });
});

describe('test generateDebugEnv', () => {
  it('test python2.7', async function () {
    const env = await generateDebugEnv('python2.7', 9000);
    expect(env).to.be.empty();
  });

  it('test python3', async function () {
    const env = await generateDebugEnv('python3', 9000);
    expect(env).to.be.empty();
  });

  it('test nodejs6', async function () {
    const env = await generateDebugEnv('nodejs6', 9000);
    expect(env).to.be('DEBUG_OPTIONS=--debug-brk=9000');
  });

  it('test nodejs8', async function () {
    const env = await generateDebugEnv('nodejs8', 9000);
    expect(env).to.be('DEBUG_OPTIONS=--inspect-brk=0.0.0.0:9000');
  });

  it('test php7.2', async function () {
    const env = await generateDebugEnv('php7.2', 9000);
    expect(env).to.be('XDEBUG_CONFIG=remote_enable=1 remote_host=30.43.124.248 remote_autostart=1 remote_port=9000');
  });

  it('test java8', async function () {
    const env = await generateDebugEnv('java8', 9000);
    expect(env).to.be('DEBUG_OPTIONS=-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,quiet=y,address=9000');
  });

});

describe('test generateDockerDebugOpts', () => {
  it('test not php7.2', async function () {
    for (let runtime of ['python2.7', 'python3', 'java8', 'nodejs6', 'nodejs8']) {
      const debugOpts = await generateDockerDebugOpts(runtime, 9000);

      expect(debugOpts).to.eql({
        'ExposedPorts': {
          '9000/tcp': {}
        },
        'HostConfig': {
          'PortBindings': {
            '9000/tcp': [
              {
                'HostIp': '',
                'HostPort': '9000'
              }
            ]
          }
        }
      });
    }
  });

  it('test php7.2', async function () {
    const opts = await generateDockerDebugOpts('php7.2', 9000);
    expect(opts).to.be.empty();
  });
});