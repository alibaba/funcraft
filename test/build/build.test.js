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
const expect = require('expect.js');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');
const { red } = require('colors');
const _ = require('lodash');
const { DEFAULT_NAS_PATH_SUFFIX, DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX } = require('../../lib/tpl');

const { tpl,
  serviceName,
  functionName,
  serviceRes,
  functionRes
} = require('../local/mock-data');

describe('test buildFunction', () => {

  const updatedContent = 'updated';
  const dumpedContent = 'dumped';

  const buildName = functionName;
  const baseDir = os.tmpdir();
  const rootArtifactsDir = path.join(baseDir, DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX);
  const verbose = true;
  const codeUri = path.resolve(baseDir, functionRes.Properties.CodeUri);
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

    await build.buildFunction(buildName, tpl, baseDir, useDocker, ['install', 'build'], verbose);

    assert.calledWith(artifact.cleanDirectory, path.join(baseDir, DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX));
    assert.calledWith(template.updateTemplateResources, tpl, buildFuncs, skippedBuildFuncs, baseDir, rootArtifactsDir);
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

    sandbox.stub(Builder, 'detectTaskFlow').resolves([mockedTaskFlowConstructor]);
    sandbox.stub(builder, 'buildInProcess').resolves({});

    await build.buildFunction(buildName, tpl, baseDir, useDocker, ['install', 'build'], verbose);

    assert.calledWith(artifact.cleanDirectory, path.join(baseDir, DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX));
    assert.calledWith(template.updateTemplateResources, tpl, buildFuncs, skippedBuildFuncs, baseDir, rootArtifactsDir);
    assert.calledWith(yaml.dump, updatedContent);
    assert.calledWith(fs.writeFile, path.join(rootArtifactsDir, 'template.yml'), dumpedContent);
    assert.calledWith(builder.buildInProcess, serviceName, functionName, path.resolve(baseDir, codeUri), runtime, path.join(rootArtifactsDir, serviceName, functionName));
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

    sandbox.stub(Builder, 'detectTaskFlow').resolves([mockedTaskFlowConstructor]);
    sandbox.stub(builder, 'buildInProcess').resolves({});

    await build.buildFunction(buildName, tpl, baseDir, useDocker, ['install', 'build'], verbose);

    assert.calledWith(artifact.cleanDirectory, path.join(baseDir, DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX));
    assert.calledWith(template.updateTemplateResources, tpl, buildFuncs, skippedBuildFuncs, baseDir, rootArtifactsDir);
    assert.calledWith(yaml.dump, updatedContent);
    assert.calledWith(fs.writeFile, path.join(rootArtifactsDir, 'template.yml'), dumpedContent);
    assert.calledWith(builder.buildInProcess, serviceName, functionName, path.resolve(baseDir, codeUri), runtime, path.join(rootArtifactsDir, serviceName, functionName));
    assert.notCalled(parser.funfileToDockerfile);
    assert.notCalled(parser.funymlToFunfile);
  });

  it('test with buildFunction with only manifest file, but with container and funfile not in the codeuri', async function () {

    const useDocker = true;

    const buildFunc = {
      functionName,
      functionRes,
      serviceName,
      serviceRes
    };

    const cloneBuildFunc = _.cloneDeep(buildFunc);

    let buildFuncs = [cloneBuildFunc];

    for (const bFunction of buildFuncs) {
      bFunction.functionRes.Properties.CodeUri = 'python3';
    }
    
    const skippedBuildFuncs = [];

    const Builder = fcBuilders.Builder;

    const mockedTaskFlowConstructor = sandbox.stub();

    const taskFlowStartStub = sandbox.stub();
    mockedTaskFlowConstructor.returns({
      start: taskFlowStartStub
    });

    sandbox.stub(Builder, 'detectTaskFlow').resolves([mockedTaskFlowConstructor]);
    sandbox.stub(builder, 'buildInDocker').resolves({});
    sandbox.stub(console, 'warn');

    const cloneTpl = _.cloneDeep(tpl);
    cloneTpl.Resources.localdemo.python3.Properties.CodeUri = 'python3';

    const funfilePath = path.join(baseDir, 'Funfile');
    const codeUri = path.resolve(baseDir, 'python3');

    const pathExistsStub = sandbox.stub(fs, 'pathExists');
    pathExistsStub.withArgs(funfilePath).resolves(true);
    pathExistsStub.withArgs(codeUri).resolves(true);

    await build.buildFunction(buildName, cloneTpl, baseDir, useDocker, ['install', 'build'], verbose);

    assert.calledWith(artifact.cleanDirectory, path.join(baseDir, DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX));
    assert.calledWith(template.updateTemplateResources, cloneTpl, buildFuncs, skippedBuildFuncs, baseDir, rootArtifactsDir);
    assert.calledWith(yaml.dump, updatedContent);
    assert.calledWith(fs.writeFile, path.join(rootArtifactsDir, 'template.yml'), dumpedContent);
    assert.calledWith(builder.buildInDocker, cloneBuildFunc.serviceName, cloneBuildFunc.serviceRes, cloneBuildFunc.functionName, cloneBuildFunc.functionRes, baseDir, codeUri, path.join(rootArtifactsDir, serviceName, functionName), verbose);
    assert.notCalled(parser.funfileToDockerfile);
    assert.notCalled(parser.funymlToFunfile);

    assert.calledWith(console.warn, red(`\nFun detected that the '${path.resolve(funfilePath)}' is not included in any CodeUri.\nPlease make sure if it is the right configuration. if yes, ignore please.`));
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

    sandbox.stub(Builder, 'detectTaskFlow').resolves([mockedTaskFlowConstructor]);
    sandbox.stub(builder, 'buildInDocker').resolves({});

    await build.buildFunction(buildName, tpl, baseDir, useDocker, ['install', 'build'], verbose);

    assert.calledWith(artifact.cleanDirectory, path.join(baseDir, DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX));
    assert.calledWith(template.updateTemplateResources, tpl, buildFuncs, skippedBuildFuncs, baseDir, rootArtifactsDir);
    assert.calledWith(yaml.dump, updatedContent);
    assert.calledWith(fs.writeFile, path.join(rootArtifactsDir, 'template.yml'), dumpedContent);
    assert.calledWith(builder.buildInDocker, serviceName, serviceRes, functionName, functionRes, baseDir, codeUri, path.join(rootArtifactsDir, serviceName, functionName), verbose);
    assert.notCalled(parser.funfileToDockerfile);
    assert.notCalled(parser.funymlToFunfile);
  });

  it('test with buildFunction with only fun.yml, but force using docker', async function () {

    const codeUri = path.resolve(baseDir, functionRes.Properties.CodeUri);
    const funfilePath = path.join(codeUri, 'Funfile');
    const funymlPath = path.join(codeUri, 'fun.yml');
    const dockerFilePath = path.join(codeUri, '.Funfile.generated.dockerfile');
    const artifactDir = path.join(baseDir, '.fun', 'build', 'artifacts', serviceName, functionName);

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

    sandbox.stub(Builder, 'detectTaskFlow').resolves([mockedTaskFlowConstructor]);
    sandbox.stub(builder, 'buildInDocker').resolves({});
    sandbox.stub(taskflow, 'isOnlyDefaultTaskFlow').returns(true);

    await build.buildFunction(buildName, tpl, baseDir, useDocker, ['install', 'build'], verbose);

    assert.calledWith(artifact.cleanDirectory, path.join(baseDir, DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX));
    assert.calledWith(template.updateTemplateResources, tpl, buildFuncs, skippedBuildFuncs, baseDir, rootArtifactsDir);
    assert.calledWith(yaml.dump, updatedContent);
    assert.calledWith(fs.writeFile, path.join(rootArtifactsDir, 'template.yml'), dumpedContent);
    assert.calledWith(taskflow.isOnlyDefaultTaskFlow, [mockedTaskFlowConstructor]);
    assert.calledWith(parser.funymlToFunfile, funymlPath);
    assert.calledWith(parser.funfileToDockerfile, funfilePath);
    assert.calledWith(docker.buildImage, codeUri, dockerFilePath, sinon.match.string);
    assert.calledWith(docker.copyFromImage, 'imageTag', '/code/.', artifactDir);
    assert.calledWith(builder.buildInDocker, serviceName, serviceRes, functionName, functionRes, baseDir, codeUri, path.join(rootArtifactsDir, serviceName, functionName), verbose);
  });

  it('test with buildFunction with install stage and only fun.yml, but force using docker', async function () {

    const codeUri = path.resolve(baseDir, functionRes.Properties.CodeUri);
    const funfilePath = path.join(codeUri, 'Funfile');
    const funymlPath = path.join(codeUri, 'fun.yml');
    const dockerFilePath = path.join(codeUri, '.Funfile.generated.dockerfile');

    const pathExistsStub = sandbox.stub(fs, 'pathExists');
    pathExistsStub.withArgs(codeUri).resolves(true);
    pathExistsStub.withArgs(funymlPath).resolves(true);
    pathExistsStub.withArgs(funfilePath).resolves(false);

    const useDocker = false;
    const Builder = fcBuilders.Builder;
    const mockedTaskFlowConstructor = sandbox.stub();
    const taskFlowStartStub = sandbox.stub();

    mockedTaskFlowConstructor.returns({
      start: taskFlowStartStub
    });
    sandbox.stub(Builder, 'detectTaskFlow').resolves([mockedTaskFlowConstructor]);
    sandbox.stub(builder, 'buildInDocker').resolves({});
    sandbox.stub(taskflow, 'isOnlyDefaultTaskFlow').returns(true);

    await build.buildFunction(buildName, tpl, baseDir, useDocker, ['install'], verbose);

    assert.calledWith(taskflow.isOnlyDefaultTaskFlow, [mockedTaskFlowConstructor]);
    assert.calledWith(parser.funymlToFunfile, funymlPath);
    assert.calledWith(parser.funfileToDockerfile, funfilePath);
    assert.calledWith(docker.buildImage, codeUri, dockerFilePath, sinon.match.string);
    assert.calledWith(docker.copyFromImage, 'imageTag', '/code/.', codeUri);
    assert.notCalled(builder.buildInDocker);
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

    const funcNasFolder = path.join(funcArtifactDir, DEFAULT_NAS_PATH_SUFFIX);
    const rootNasFolder = path.join(rootArtifactsDir, DEFAULT_NAS_PATH_SUFFIX);

    const nasMappings = [
      {
        localNasDir: 'localNasDir',
        remoteNasDir: 'remoteNasDir'
      }
    ];

    await build.copyNasArtifact(nasMappings, 'imageTag', rootArtifactsDir, funcArtifactDir);

    assert.calledWith(fs.pathExists, funcNasFolder);
    assert.calledWith(fs.ensureDir, rootNasFolder);
    assert.calledWith(fs.remove, funcNasFolder);

    assert.calledWith(docker.copyFromImage, 'imageTag', 'remoteNasDir/.', 'localNasDir');
  });
});

describe('test getOrConvertFunfile', () => {
  let randomDir;

  beforeEach(async () => {
    randomDir = path.join(tempDir, uuid.v4());
    await fs.mkdirp(randomDir);
  });

  afterEach(async () => {
    await fs.remove(randomDir);
  });

  it('test no funyml', async () => {
    const funfilePath = await build.getOrConvertFunfile(randomDir);
    expect(funfilePath).to.be(null);
  });

  it('test exist funyml', async () => {
    const funymlPath = path.join(randomDir, 'fun.yml');
    const funfilePath = path.join(randomDir, 'Funfile');

    await fs.writeFile(funymlPath, `runtime: python3
tasks:
  - apt: libzbar0
  - shell: ln -sf libzbar.so.0.2.0 libzbar.so
    cwd: /code/.fun/root/usr/lib
  - pip: Pillow
  - pip: pyzbar`);

    const p = await build.getOrConvertFunfile(randomDir);

    expect(p).to.eql(funfilePath);

    expect(await fs.exists(funfilePath)).to.be(true);
    const funfileContent = await fs.readFile(funfilePath, 'utf8');
    expect(funfileContent).to.eql(`RUNTIME python3
WORKDIR /code
RUN fun-install apt-get install libzbar0
COPY . /code
RUN cd /code/.fun/root/usr/lib && ln -sf libzbar.so.0.2.0 libzbar.so
RUN fun-install pip install Pillow
RUN fun-install pip install pyzbar`);
  });

  it('test exist funfile', async () => {
    const funfilePath = path.join(randomDir, 'Funfile');

    await fs.writeFile(funfilePath, `RUNTIME python3`);

    const p = await build.getOrConvertFunfile(randomDir);

    expect(p).to.eql(funfilePath);
  });
});
