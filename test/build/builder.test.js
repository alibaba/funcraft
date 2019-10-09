'use strict';

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const builder = require('../../lib/build/builder');
const buildOpts = require('../../lib/build/build-opts');
const fcBuilders = require('@alicloud/fc-builders');

const assert = sandbox.assert;

const os = require('os');
const path = require('path');
const docker = require('../../lib/docker');

const { serviceName,
  functionName,
  serviceRes,
  functionRes
} = require('../local/mock-data');

const baseDir = os.tmpdir();
const rootArtifactsDir = path.join(baseDir, '.fun', 'build', 'artifacts');
const verbose = true;
const codeUri = path.resolve(baseDir, functionRes.Properties.CodeUri);
const funcArtifactDir = path.join(rootArtifactsDir, serviceName, functionName);
const testOpts = 'opts';

describe('test buildInDocker', () => {

  beforeEach(() => {
    sandbox.stub(docker, 'run').resolves({ StatusCode: 0 });
    sandbox.stub(buildOpts, 'generateBuildContainerBuildOpts').resolves(testOpts);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test buildInDocker', async function () {
    await builder.buildInDocker(serviceName, serviceRes, functionName, functionRes, baseDir, codeUri, funcArtifactDir, verbose);

    assert.calledWith(buildOpts.generateBuildContainerBuildOpts, serviceName, serviceRes, functionName, functionRes, baseDir, codeUri, funcArtifactDir, verbose);
    assert.calledWith(docker.run, testOpts, null, process.stdout, process.stderr);
  });
});

describe('test buildInProcess', () => {

  beforeEach(() => {

    sandbox.stub(fcBuilders.Builder.prototype, 'build').resolves({});
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test buildInProcess', async function () {
    await builder.buildInProcess(serviceName, serviceRes, functionName, functionRes, baseDir, codeUri, funcArtifactDir, verbose);

    assert.calledWith(fcBuilders.Builder.prototype.build);
  });
});