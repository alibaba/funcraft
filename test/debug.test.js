'use strict';

const expect = require('expect.js');

const {
  generateVscodeDebugConfig, generateDebugEnv,
  generateDockerDebugOpts, getDebugIde
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
          'protocol': 'inspector',
          'stopOnEntry': false
        }
      ]
    });
  });

  it('test nodejs10', async function () {

    const debugConfig = await generateVscodeDebugConfig(serviceName, functionName, 'nodejs10', '.', 9000);

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
          'protocol': 'inspector',
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
    expect(env).to.eql({ 'DEBUG_OPTIONS': '-m ptvsd --host 0.0.0.0 --port 9000 --wait' });
  });

  it('test python3', async function () {
    const env = await generateDebugEnv('python3', 9000);
    expect(env).to.eql({ 'DEBUG_OPTIONS': '-m ptvsd --host 0.0.0.0 --port 9000 --wait' });
  });

  it('test nodejs6', async function () {
    const env = await generateDebugEnv('nodejs6', 9000);
    expect(env).to.eql({ 'DEBUG_OPTIONS': '--debug-brk=9000' });
  });

  it('test nodejs8', async function () {
    const env = await generateDebugEnv('nodejs8', 9000);
    expect(env).to.eql({ 'DEBUG_OPTIONS': '--inspect-brk=0.0.0.0:9000' });
  });

  it('test nodejs10', async function () {
    const env = await generateDebugEnv('nodejs10', 9000);
    expect(env).to.eql({ 'DEBUG_OPTIONS': '--inspect-brk=0.0.0.0:9000' });
  });

  it('test php7.2', async function () {
    const env = await generateDebugEnv('php7.2', 9000);
    expect(env.XDEBUG_CONFIG).to.contain('remote_enable=1 remote_autostart=1 remote_port=9000 remote_host=');
  });

  it('test java8', async function () {
    const env = await generateDebugEnv('java8', 9000);
    expect(env).to.eql({ 'DEBUG_OPTIONS': '-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,quiet=y,address=9000' });
  });

  it('test python3 with pycharm', async function () {
    const env = await generateDebugEnv('python3', 9000, 'pycharm');
    expect(env).to.eql({});
  });

  it('test python2.7 with pycharm', async function () {
    const env = await generateDebugEnv('python2.7', 9000, 'pycharm');
    expect(env).to.eql({});
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

describe('test getDebugIde', () => {
  it('test debug ide1', () => {
    const ide = getDebugIde({ config: 'vscode' });
    expect(ide).to.eql('vscode');
  });

  it('test debug ide2', () => {
    const ide = getDebugIde({ config: 'vsCode' });
    expect(ide).to.eql('vscode');
  });

  it('test debug ide3', () => {
    const ide = getDebugIde({ config: 'pycharm' });
    expect(ide).to.eql('pycharm');
  });

  it('test debug ide4', () => {
    const ide = getDebugIde({ config: 'PYCHARM' });
    expect(ide).to.eql('pycharm');
  });

  it('test debug ide6', () => {
    const ide = getDebugIde();
    expect(ide).to.be(null);
  });
});