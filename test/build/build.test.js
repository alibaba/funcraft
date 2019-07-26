'use strict';

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const artifact = require('../../lib/build/artifact');
const template = require('../../lib/build/template');
const fcBuilders = require('@alicloud/fc-builders');
const builder = require('../../lib/build/builder');
const taskflow = require('../../lib/build/taskflow');

const assert = sandbox.assert;

const util = require('util');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');

const { tpl, serviceName,
  functionName,
  serviceRes,
  functionRes
} = require('../local/mock-data');

describe('test buildFunction', () => {

  let build;

  const updatedContent = 'updated';
  const dumpedContent = 'dumped';
  let writeFile;

  const buildName = functionName;
  const projectRoot = os.tmpdir();
  const tplPath = path.join(projectRoot, 'template.yml');
  const rootArtifactsDir = path.join(projectRoot, '.fun', 'build', 'artifacts');
  const verbose = true;
  const codeUri = path.resolve(projectRoot, functionRes.Properties.CodeUri);
  const runtime = functionRes.Properties.Runtime;

  beforeEach(() => {
    writeFile = sandbox.stub();

    sandbox.stub(artifact, 'cleanDirectory').resolves({});
    sandbox.stub(util, 'promisify').returns(writeFile);

    sandbox.stub(template, 'updateTemplateResources').returns(updatedContent);
    sandbox.stub(yaml, 'dump').returns(dumpedContent);

    const proxyquire = require('proxyquire');
    build = proxyquire('../../lib/build/build', {
      'util': util
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test with buildFunction without manifest file', async function () {
    const useContainer = false;

    const buildFunc = {
      functionName,
      functionRes,
      serviceName,
      serviceRes
    };

    const buildFuncs = [buildFunc];
    const skippedBuildFuncs = [buildFunc];

    const Builder = fcBuilders.Builder;
    sandbox.stub(Builder, 'detectTaskFlow').resolves([]);

    await build.buildFunction(buildName, tpl, tplPath, useContainer, verbose);

    assert.calledWith(artifact.cleanDirectory, path.join(projectRoot, '.fun/build/artifacts'));
    assert.calledWith(template.updateTemplateResources, tpl, buildFuncs, skippedBuildFuncs, projectRoot, rootArtifactsDir);
    assert.calledWith(yaml.dump, updatedContent);
    assert.calledWith(writeFile, path.join(rootArtifactsDir, 'template.yml'), dumpedContent);
  });

  it('test with buildFunction with only manifest file', async function () {
    const useContainer = false;

    const buildFunc = {
      functionName,
      functionRes,
      serviceName,
      serviceRes
    };

    const buildFuncs = [buildFunc];
    const skippedBuildFuncs = [];

    const Builder = fcBuilders.Builder;

    const mockedTaskFlowConstructor = sandbox.stub();

    const taskFlowStartStub = sandbox.stub();
    mockedTaskFlowConstructor.returns({
      start: taskFlowStartStub
    });

    sandbox.stub(Builder, 'detectTaskFlow').resolves([ mockedTaskFlowConstructor ]);
    sandbox.stub(builder, 'buildInProcess').resolves({});

    await build.buildFunction(buildName, tpl, tplPath, useContainer, verbose);

    assert.calledWith(artifact.cleanDirectory, path.join(projectRoot, '.fun/build/artifacts'));
    assert.calledWith(template.updateTemplateResources, tpl, buildFuncs, skippedBuildFuncs, projectRoot, rootArtifactsDir);
    assert.calledWith(yaml.dump, updatedContent);
    assert.calledWith(writeFile, path.join(rootArtifactsDir, 'template.yml'), dumpedContent);
    assert.calledWith(builder.buildInProcess, serviceName, functionName, path.resolve(projectRoot, codeUri), runtime, path.join(rootArtifactsDir, serviceName, functionName));
  });

  it('test with buildFunction with only manifest file, but not container', async function () {

    const useContainer = false;

    const buildFunc = {
      functionName,
      functionRes,
      serviceName,
      serviceRes
    };

    const buildFuncs = [buildFunc];
    const skippedBuildFuncs = [];

    const Builder = fcBuilders.Builder;

    const mockedTaskFlowConstructor = sandbox.stub();

    const taskFlowStartStub = sandbox.stub();
    mockedTaskFlowConstructor.returns({
      start: taskFlowStartStub
    });

    sandbox.stub(Builder, 'detectTaskFlow').resolves([ mockedTaskFlowConstructor ]);
    sandbox.stub(builder, 'buildInProcess').resolves({});

    await build.buildFunction(buildName, tpl, tplPath, useContainer, verbose);

    assert.calledWith(artifact.cleanDirectory, path.join(projectRoot, '.fun/build/artifacts'));
    assert.calledWith(template.updateTemplateResources, tpl, buildFuncs, skippedBuildFuncs, projectRoot, rootArtifactsDir);
    assert.calledWith(yaml.dump, updatedContent);
    assert.calledWith(writeFile, path.join(rootArtifactsDir, 'template.yml'), dumpedContent);
    assert.calledWith(builder.buildInProcess, serviceName, functionName, path.resolve(projectRoot, codeUri), runtime, path.join(rootArtifactsDir, serviceName, functionName));
  });

  it('test with buildFunction with only manifest file, but with container', async function () {

    const useContainer = true;

    const buildFunc = {
      functionName,
      functionRes,
      serviceName,
      serviceRes
    };

    const buildFuncs = [buildFunc];
    const skippedBuildFuncs = [];

    const Builder = fcBuilders.Builder;

    const mockedTaskFlowConstructor = sandbox.stub();

    const taskFlowStartStub = sandbox.stub();
    mockedTaskFlowConstructor.returns({
      start: taskFlowStartStub
    });

    sandbox.stub(Builder, 'detectTaskFlow').resolves([ mockedTaskFlowConstructor ]);
    sandbox.stub(builder, 'buildInContainer').resolves({});

    await build.buildFunction(buildName, tpl, tplPath, useContainer, verbose);

    assert.calledWith(artifact.cleanDirectory, path.join(projectRoot, '.fun/build/artifacts'));
    assert.calledWith(template.updateTemplateResources, tpl, buildFuncs, skippedBuildFuncs, projectRoot, rootArtifactsDir);
    assert.calledWith(yaml.dump, updatedContent);
    assert.calledWith(writeFile, path.join(rootArtifactsDir, 'template.yml'), dumpedContent);
    assert.calledWith(builder.buildInContainer, serviceName, serviceRes, functionName, functionRes, projectRoot, codeUri, path.join(rootArtifactsDir, serviceName, functionName), verbose);
  });

  it('test with buildFunction with only fun.yml, but force using docker', async function () {
    const useContainer = false;

    const buildFunc = {
      functionName,
      functionRes,
      serviceName,
      serviceRes
    };

    const buildFuncs = [buildFunc];
    const skippedBuildFuncs = [buildFunc];

    const Builder = fcBuilders.Builder;

    const mockedTaskFlowConstructor = sandbox.stub();

    const taskFlowStartStub = sandbox.stub();
    mockedTaskFlowConstructor.returns({
      start: taskFlowStartStub
    });

    sandbox.stub(Builder, 'detectTaskFlow').resolves([ mockedTaskFlowConstructor ]);
    sandbox.stub(builder, 'buildInContainer').resolves({});
    sandbox.stub(taskflow, 'isOnlyFunYmlTaskFlow').returns(true);
    sandbox.stub(taskflow, 'needBuildUsingContainer').returns(true);

    await build.buildFunction(buildName, tpl, tplPath, useContainer, verbose);

    assert.calledWith(artifact.cleanDirectory, path.join(projectRoot, '.fun/build/artifacts'));
    assert.calledWith(template.updateTemplateResources, tpl, buildFuncs, skippedBuildFuncs, projectRoot, rootArtifactsDir);
    assert.calledWith(yaml.dump, updatedContent);
    assert.calledWith(writeFile, path.join(rootArtifactsDir, 'template.yml'), dumpedContent);
    assert.calledWith(builder.buildInContainer, serviceName, serviceRes, functionName, functionRes, projectRoot, codeUri, path.join(rootArtifactsDir, serviceName, functionName), verbose);
    assert.calledWith(taskflow.isOnlyFunYmlTaskFlow, [ mockedTaskFlowConstructor ]);
  });
});

