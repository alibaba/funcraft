'use strict';

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const artifact = require('../../lib/build/artifact');
const template = require('../../lib/build/template');
const fcBuilders = require('@alicloud/fc-builders');
const builder = require('../../lib/build/builder');
const taskflow = require('../../lib/build/taskflow');
const parser = require('../../lib/build/parser');
const fs = require('fs-extra');
const docker = require('../../lib/docker');
const tempDir = require('temp-dir');
let build = require('../../lib/build/build');
const uuid = require('uuid');
const util = require('util');
const nas = require('../../lib/nas');

const assert = sandbox.assert;

const os = require('os');
const path = require('path');
const yaml = require('js-yaml');

const { tpl, 
  serviceName,
  functionName,
  serviceRes,
  functionRes,
  serviceResWithNasConfig
} = require('../local/mock-data');

describe('test buildFunction', () => {

  const updatedContent = 'updated';
  const dumpedContent = 'dumped';

  const buildName = functionName;
  const projectRoot = os.tmpdir();
  const rootArtifactsDir = path.join(projectRoot, '.fun', 'build', 'artifacts');
  const verbose = true;
  const codeUri = path.resolve(projectRoot, functionRes.Properties.CodeUri);
  const runtime = functionRes.Properties.Runtime;

  beforeEach(() => {
    sandbox.stub(fs, 'writeFile');

    sandbox.stub(artifact, 'cleanDirectory').resolves({});

    sandbox.stub(template, 'updateTemplateResources').returns(updatedContent);
    sandbox.stub(yaml, 'dump').returns(dumpedContent);

    sandbox.stub(parser, 'funfileToDockerfile').resolves('');
    sandbox.stub(parser, 'funymlToFunfile').resolves('');
    sandbox.stub(docker, 'buildImage').resolves('imageTag');
    sandbox.stub(docker, 'copyFromImage').resolves('');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test with buildFunction without manifest file, Funfile, funyml', async function () {
    const useDocker = false;

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

    sandbox.stub(taskflow, 'isOnlyDefaultTaskFlow').returns(false);

    await build.buildFunction(buildName, tpl, projectRoot, useDocker, verbose);

    assert.calledWith(artifact.cleanDirectory, path.join(projectRoot, '.fun', 'build', 'artifacts'));
    assert.calledWith(template.updateTemplateResources, tpl, buildFuncs, skippedBuildFuncs, projectRoot, rootArtifactsDir);
    assert.calledWith(yaml.dump, updatedContent);
    assert.calledWith(fs.writeFile, path.join(rootArtifactsDir, 'template.yml'), dumpedContent);
    assert.notCalled(parser.funfileToDockerfile);
    assert.notCalled(parser.funymlToFunfile);
  });

  it('test with buildFunction with only manifest file', async function () {
    const useDocker = false;

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

    await build.buildFunction(buildName, tpl, projectRoot, useDocker, verbose);

    assert.calledWith(artifact.cleanDirectory, path.join(projectRoot, '.fun', 'build', 'artifacts'));
    assert.calledWith(template.updateTemplateResources, tpl, buildFuncs, skippedBuildFuncs, projectRoot, rootArtifactsDir);
    assert.calledWith(yaml.dump, updatedContent);
    assert.calledWith(fs.writeFile, path.join(rootArtifactsDir, 'template.yml'), dumpedContent);
    assert.calledWith(builder.buildInProcess, serviceName, functionName, path.resolve(projectRoot, codeUri), runtime, path.join(rootArtifactsDir, serviceName, functionName));
    assert.notCalled(parser.funfileToDockerfile);
    assert.notCalled(parser.funymlToFunfile);
  });

  it('test with buildFunction with only manifest file, but not container', async function () {

    const useDocker = false;

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

    await build.buildFunction(buildName, tpl, projectRoot, useDocker, verbose);

    assert.calledWith(artifact.cleanDirectory, path.join(projectRoot, '.fun', 'build', 'artifacts'));
    assert.calledWith(template.updateTemplateResources, tpl, buildFuncs, skippedBuildFuncs, projectRoot, rootArtifactsDir);
    assert.calledWith(yaml.dump, updatedContent);
    assert.calledWith(fs.writeFile, path.join(rootArtifactsDir, 'template.yml'), dumpedContent);
    assert.calledWith(builder.buildInProcess, serviceName, functionName, path.resolve(projectRoot, codeUri), runtime, path.join(rootArtifactsDir, serviceName, functionName));
    assert.notCalled(parser.funfileToDockerfile);
    assert.notCalled(parser.funymlToFunfile);
  });

  it('test with buildFunction with only manifest file, but with container', async function () {

    const useDocker = true;

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
    sandbox.stub(builder, 'buildInDocker').resolves({});

    await build.buildFunction(buildName, tpl, projectRoot, useDocker, verbose);

    assert.calledWith(artifact.cleanDirectory, path.join(projectRoot, '.fun', 'build', 'artifacts'));
    assert.calledWith(template.updateTemplateResources, tpl, buildFuncs, skippedBuildFuncs, projectRoot, rootArtifactsDir);
    assert.calledWith(yaml.dump, updatedContent);
    assert.calledWith(fs.writeFile, path.join(rootArtifactsDir, 'template.yml'), dumpedContent);
    assert.calledWith(builder.buildInDocker, serviceName, serviceRes, functionName, functionRes, projectRoot, codeUri, path.join(rootArtifactsDir, serviceName, functionName), verbose);
    assert.notCalled(parser.funfileToDockerfile);
    assert.notCalled(parser.funymlToFunfile);
  });

  it('test with buildFunction with only fun.yml, but force using docker', async function () {

    const codeUri = path.resolve(projectRoot, functionRes.Properties.CodeUri);
    const funfilePath = path.join(codeUri, 'Funfile');
    const funymlPath = path.join(codeUri, 'fun.yml');
    const dockerFilePath = path.join(codeUri, '.Funfile.generated.dockerfile');
    const artifactDir = path.join(projectRoot, '.fun', 'build', 'artifacts', serviceName, functionName);

    const pathExistsStub = sandbox.stub(fs, 'pathExists');
    pathExistsStub.withArgs(codeUri).resolves(true);
    pathExistsStub.withArgs(funymlPath).resolves(true);
    pathExistsStub.withArgs(funfilePath).resolves(false);


    const useDocker = false;

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
    sandbox.stub(builder, 'buildInDocker').resolves({});
    sandbox.stub(taskflow, 'isOnlyDefaultTaskFlow').returns(true);

    await build.buildFunction(buildName, tpl, projectRoot, useDocker, verbose);
    
    assert.calledWith(artifact.cleanDirectory, path.join(projectRoot, '.fun', 'build', 'artifacts'));
    assert.calledWith(template.updateTemplateResources, tpl, buildFuncs, skippedBuildFuncs, projectRoot, rootArtifactsDir);
    assert.calledWith(yaml.dump, updatedContent);
    assert.calledWith(fs.writeFile, path.join(rootArtifactsDir, 'template.yml'), dumpedContent);
    assert.notCalled(taskflow.isOnlyDefaultTaskFlow);
    assert.calledWith(parser.funymlToFunfile, funymlPath);
    assert.calledWith(parser.funfileToDockerfile, funfilePath);
    assert.calledWith(docker.buildImage, codeUri, dockerFilePath, sinon.match.string);
    assert.calledWith(docker.copyFromImage, 'imageTag', '/code/.', artifactDir);
    assert.calledWith(builder.buildInDocker, serviceName, serviceRes, functionName, functionRes, projectRoot, codeUri, path.join(rootArtifactsDir, serviceName, functionName), verbose);
  });
});

describe('test copyNasArtifact', () => {

  let rootArtifactsDir;
  let funcArtifactDir;
  let ncpStub;

  beforeEach(() => {
    rootArtifactsDir = path.join(tempDir, uuid.v4());
    funcArtifactDir = path.join(rootArtifactsDir, serviceName, functionName);

    sandbox.stub(fs, 'pathExists').resolves(true);
    sandbox.stub(fs, 'ensureDir').resolves();
    sandbox.stub(fs, 'remove').resolves();

    ncpStub = sandbox.stub();

    sandbox.stub(util, 'promisify').returns(ncpStub);

    sandbox.stub(nas, 'convertNasConfigToNasMappings').resolves([{
      localNasDir: 'localNasDir',
      remoteNasDir: 'remoteNasDir'
    }]);

    sandbox.stub(docker, 'copyFromImage').resolves();

    build = require('proxyquire')('../../lib/build/build', {
      'util': util
    });
  });

  afterEach(async () => {
    await fs.remove(rootArtifactsDir);
    sandbox.restore();
  });

  it('test with .fun/nas and nasConfig', async () => {

    const funcNasFolder = path.join(funcArtifactDir, '.fun', 'nas');
    const rootNasFolder = path.join(rootArtifactsDir, '.fun', 'nas');

    await build.copyNasArtifact(serviceName, serviceResWithNasConfig, 'imageTag', rootArtifactsDir, funcArtifactDir);

    assert.calledWith(fs.pathExists, funcNasFolder);
    assert.calledWith(fs.ensureDir, rootNasFolder);
    assert.calledWith(fs.remove, funcNasFolder);

    assert.calledWith(nas.convertNasConfigToNasMappings, rootArtifactsDir, serviceResWithNasConfig.Properties.NasConfig, serviceName);

    assert.calledWith(docker.copyFromImage, 'imageTag', 'remoteNasDir/.', 'localNasDir');
    
  });
});
