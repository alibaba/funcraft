'use strict';

const expect = require('expect.js');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sandbox.assert;

const path = require('path');
const mkdirp = require('mkdirp-promise');
const { hasDocker } = require('../conditions');
const tempDir = require('temp-dir');
const rimraf = require('rimraf');
const fs = require('fs');
const streams = require('memory-streams');

const Inovke = require('../../lib/local/invoke');
const definition = require('../../lib/definition');

const util = require('util');
const yaml = require('js-yaml');
const readFile = util.promisify(fs.readFile);

let LocalInvoke = require('../../lib/local/local-invoke');

const { functionName, functionRes,
  serviceName, serviceRes,
  debugPort, debugIde,
  codeMount, tpl } = require('./mock-data');

const docker = require('../../lib/docker');
const dockerOpts = require('../../lib/docker-opts');

const proxyquire = require('proxyquire');

describe('test local invoke init', async () => {

  beforeEach(() => {

    sandbox.stub(docker, 'resolveCodeUriToMount').resolves(codeMount);
    sandbox.stub(docker, 'pullImageIfNeed').resolves({});
    sandbox.stub(docker, 'generateDockerEnvs').resolves({});

    sandbox.stub(dockerOpts, 'generateLocalInvokeOpts').resolves({});

    sandbox.stub(Inovke.prototype, 'init').resolves({});

    LocalInvoke = proxyquire('../../lib/local/local-invoke', {
      '../docker': docker,
      '../docker-opts': dockerOpts
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test init', async () => {

    const invoke = new LocalInvoke(serviceName,
      serviceRes,
      functionName,
      functionRes,
      debugPort,
      debugIde,
      '.');

    await invoke.init();

    expect(invoke.cmd).to.eql([ '-h', 'index.handler', '--stdin' ]);

    assert.calledWith(docker.generateDockerEnvs, '.', serviceName, serviceRes.Properties, functionName, invoke.functionProps, invoke.debugPort, null);

    assert.calledWith(dockerOpts.generateLocalInvokeOpts, 
      invoke.runtime,
      invoke.containerName, 
      invoke.mounts,
      invoke.cmd,
      invoke.debugPort,
      invoke.envs,
      invoke.dockerUser);
  });

  it('default first function when fun local invoke', async () => {
    var tplPath = path.join('./examples', 'local', 'template.yml');
    const tplContent = await readFile(tplPath, 'utf8');
    const tpl = yaml.safeLoad(tplContent);
    var firstFuntionName = definition.findFirstFunctionName(tpl);
    expect(firstFuntionName).equal('localdemo/php72');
  });
});

describe('test local invoke reuse', async () => {
  beforeEach(() => {

    sandbox.stub(docker, 'getContainer').resolves({});
    sandbox.stub(docker, 'execContainer').resolves({});
    sandbox.stub(docker, 'renameContainer').resolves({});
    sandbox.stub(docker, 'run').resolves({});

    sandbox.stub(dockerOpts, 'generateLocalInvokeOpts').resolves({});

    sandbox.stub(Inovke.prototype, 'init').resolves({});

    LocalInvoke = proxyquire('../../lib/local/local-invoke', {
      '../docker': docker,
      '../docker-opts': dockerOpts
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test reuse run container with existed container', async () => {
    sandbox.stub(docker, 'listContainers').resolves(['container1']);
    const invoke = new LocalInvoke(serviceName,
      serviceRes,
      functionName,
      functionRes,
      undefined,
      undefined,
      '.',
      undefined,
      undefined,
      undefined,
      true
    );

    await invoke.doInvoke();

    assert.notCalled(docker.run);
    assert.calledWith(docker.listContainers, { filters: `{"name": ["fun-local-${serviceName}-${functionName}-run-inited"]}` });
    assert.neverCalledWith(docker.listContainers, { filters: `{"name": ["fun-local-${serviceName}-${functionName}-run"]}` });
    assert.called(docker.execContainer);
    assert.notCalled(docker.renameContainer);
  });

  it('test not reuse run container with none existed container', async () => {
    sandbox.stub(docker, 'listContainers').resolves([]);
    const invoke = new LocalInvoke(serviceName,
      serviceRes,
      functionName,
      functionRes,
      undefined,
      undefined,
      '.',
      undefined,
      undefined,
      undefined,
      true
    );

    await invoke.doInvoke();

    assert.called(docker.run);
    assert.calledWith(docker.listContainers.firstCall, { filters: `{"name": ["fun-local-${serviceName}-${functionName}-run-inited"]}` });
    assert.calledWith(docker.listContainers.secondCall, { filters: `{"name": ["fun-local-${serviceName}-${functionName}-run"]}` });
    assert.notCalled(docker.execContainer);
    assert.notCalled(docker.renameContainer);
  });

  it('test reuse debug container with existed container', async () => {
    sandbox.stub(docker, 'listContainers').resolves(['container1']);
    const invoke = new LocalInvoke(serviceName,
      serviceRes,
      functionName,
      functionRes,
      debugPort,
      debugIde,
      '.',
      undefined,
      undefined,
      undefined,
      true
    );

    await invoke.doInvoke();

    assert.notCalled(docker.run);
    assert.calledWith(docker.listContainers, { filters: `{"name": ["fun-local-${serviceName}-${functionName}-debug-inited"]}` });
    assert.neverCalledWith(docker.listContainers, { filters: `{"name": ["fun-local-${serviceName}-${functionName}-debug"]}` });
    assert.called(docker.execContainer);
    assert.notCalled(docker.renameContainer);
  });

  it('test not reuse debug container with none existed container', async () => {
    sandbox.stub(docker, 'listContainers').resolves([]);
    const invoke = new LocalInvoke(serviceName,
      serviceRes,
      functionName,
      functionRes,
      debugPort,
      debugIde,
      '.',
      undefined,
      undefined,
      undefined,
      true
    );

    await invoke.doInvoke();

    assert.called(docker.run);
    assert.calledWith(docker.listContainers.firstCall, { filters: `{"name": ["fun-local-${serviceName}-${functionName}-debug-inited"]}` });
    assert.calledWith(docker.listContainers.secondCall, { filters: `{"name": ["fun-local-${serviceName}-${functionName}-debug"]}` });
    assert.notCalled(docker.execContainer);
    assert.notCalled(docker.renameContainer);
  });
});

(hasDocker ? describe : describe.skip)('Integration::invoke', () => {
  
  const projectDir = path.join(tempDir, 'invoke-it-dir'); 
  const ymlPath = path.join(projectDir, 'template.yml');
  const index = path.join(projectDir, 'index.py');

  const beforeCwd = process.cwd();
  
  beforeEach(async () => {
    await mkdirp(projectDir);
    console.log('tempDir: %s', projectDir);

    fs.writeFileSync(ymlPath, tpl);
    fs.writeFileSync(index, `
def handler(event, context):
    return "hello world"
`);

    process.chdir(projectDir);
  });
  
  afterEach(async function () {
    rimraf.sync(projectDir);
    process.chdir(beforeCwd);
  });

  it('test local invoke', async () => {
    const localInvoke = new LocalInvoke(serviceName, serviceRes,
      functionName, functionRes, null, null, projectDir);

    const outputStream = new streams.WritableStream();
      
    await localInvoke.invoke('{}', {outputStream: outputStream});

    const res = outputStream.toString();

    expect(res).contain('hello world');
  });
});
  