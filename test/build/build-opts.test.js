'use strict';

const expect = require('expect.js');

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const definition = require('../../lib/definition');
const docker = require('../../lib/docker');
const path = require('path');
const dockerOpts = require('../../lib/docker-opts');

const { serviceName,
  functionName,
  serviceRes,
  functionRes
} = require('../local/mock-data');

const {
  generateBuildContainerBuildOpts
} = require('../../lib/build/build-opts');

describe('test generateBuildContainerBuildOpts', () => {

  beforeEach(() => {
    sandbox.stub(definition, 'parseFunctionPath').returns(['service', 'function']);
    sandbox.stub(definition, 'findFunctionInTpl').returns({ functionName: 'function' });
    sandbox.stub(definition, 'findFunctionsInTpl').returns(['func1', 'func2']);
    sandbox.stub(docker, 'generateDockerEnvs').resolves({ 'envKey': 'envValue' });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test with generateBuildContainerBuildOpts', async function () {

    sandbox.stub(docker, 'generateRamdomContainerName').returns('containerName');

    const opts = await generateBuildContainerBuildOpts(serviceName, serviceRes, functionName, functionRes, '/', './', '/funcArtifactDir', false);

    expect(opts).to.eql({
      'Env': [
        'envKey=envValue',
        'LD_LIBRARY_PATH=/code/.fun/root/usr/lib:/code/.fun/root/usr/lib/x86_64-linux-gnu:/code:/code/lib:/usr/local/lib',
        'PATH=/code/.fun/root/usr/local/bin:/code/.fun/root/usr/local/sbin:/code/.fun/root/usr/bin:/code/.fun/root/usr/sbin:/code/.fun/root/sbin:/code/.fun/root/bin:/code/.fun/python/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/sbin:/bin',
        'PYTHONUSERBASE=/code/.fun/python'
      ],
      'Image': `aliyunfc/runtime-python3.6:build-${dockerOpts.IMAGE_VERSION}`,
      'name': 'containerName',
      'Cmd': [
        'fun-install',
        'build',
        '--json-params',
        '{"method":"build","serviceName":"localdemo","functionName":"python3","sourceDir":"/code","runtime":"python3","artifactDir":"/artifactsMount","verbose":false}'
      ],
      'User': '0:0',
      'OpenStdin': true,
      'Tty': false,
      'StdinOnce': true,
      'AttachStdin': true,
      'AttachStdout': true,
      'AttachStderr': true,
      'HostConfig': {
        'AutoRemove': true,
        'Mounts': [
          {
            'Type': 'bind',
            'Source': path.resolve('/'),
            'Target': '/code',
            'ReadOnly': false
          },
          {
            'Type': 'bind',
            'Source': '/funcArtifactDir',
            'Target': '/artifactsMount',
            'ReadOnly': false
          }
        ]
      }
    });
  });
});

