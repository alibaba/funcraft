'use strict';

const { PipTask, AptTask, ShellTask } = require('../../lib/install/task');
const Context = require('../../lib/install/context');
const { hasDocker } = require('../conditions');
const tempDir = require('temp-dir');
const path = require('path');
const mkdirp = require('mkdirp-promise');
const chai = require('chai');
const expect = chai.expect;
const docker = require('../../lib/docker');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

chai.use(require('chai-fs'));

describe('test PipTask', () => {

  let runnerStub;

  beforeEach(() => {
    runnerStub = {
      exec: sandbox.stub(),
      stop: sandbox.stub()
    };

    sandbox.stub(docker, 'startInstallationContainer').resolves(runnerStub);

  });

  afterEach(() => {
    sandbox.restore();
  });

  it('test PipTask', async () => {
    const funTempDir = path.join(tempDir, 'funtemp');
    const pipTask = new PipTask('install pymssql', 'python2.7', funTempDir, 'pymssql', true);
    await pipTask.run();

    assert.calledWith(docker.startInstallationContainer, {
      codeUri: funTempDir,
      runtime: 'python2.7',
      targets: undefined
    });

    assert.calledWith(runnerStub.exec, ['pip', 'install', '--user', '--no-warn-script-location', 'pymssql'], {
      env: { PIP_DISABLE_PIP_VERSION_CHECK: '1', PYTHONUSERBASE: '/code/.fun/python' },
      verbose: false
    });

    assert.calledOnce(runnerStub.stop);
  });
});


(hasDocker ? describe : describe.skip)('Integration::task', () => {

  const funTempDir = path.join(tempDir, 'funtemp');
  const cleanTask = new ShellTask('clean task', 'python2.7', funTempDir, 'rm -rf ./{*,.[!.]*}');

  beforeEach(async () => {
    await mkdirp(funTempDir);
    console.log('tempDir: %s', funTempDir);
  });

  afterEach(async () => {
    await cleanTask.run();
  });

  it('pip_local', async function () {
    this.timeout(10000);
    const installedDir = path.join(funTempDir, '.fun/python/lib/python2.7/site-packages/');

    expect(funTempDir).to.be.a.directory().and.empty;

    const pipTask = new PipTask('install pymssql', 'python2.7', funTempDir, 'pymssql', true);
    await pipTask.run();

    expect(installedDir).to.be.a.directory().with.files(['pymssql.so', '_mssql.so']);
    expect(installedDir).to.be.a.directory().with.subDirs(['.libs_mssql', '.libspymssql', 'pymssql-2.1.4.dist-info']);

  });

  it('pip_gloabl', async function () {
    this.timeout(10000);
    const context = await new Context('python2.7', funTempDir);
    const pipTask = new PipTask('install pymssql', 'python2.7', funTempDir, 'pymssql', false, null, null, context);
    await pipTask.run();

    await context.teardown();
  });

  it('apt_local', async function () {
    this.timeout(30000);

    const aptTask = new AptTask('install libsybdb5', 'python3', funTempDir, 'libsybdb5', true, null);
    await aptTask.run();

    const installedDir = path.join(funTempDir, '.fun/root/usr/lib/x86_64-linux-gnu/');

    expect(installedDir).to.be.a.directory().with.files(['libsybdb.so.5', 'libsybdb.so.5.0.0']);

  });

  it('apt_global', async function () {
    this.timeout(20000);

    const context = await new Context('python3', funTempDir);

    const aptTask = new AptTask('install libsybdb5', 'python3', funTempDir, 'libsybdb5', false, null, context);
    await aptTask.run();

    await context.teardown();

  });

  it('shell', async function () {
    this.timeout(10000);

    const context = await new Context('python3', funTempDir);

    const shellTask = new ShellTask(undefined, 'python3', funTempDir, 'echo \'aa\' > 1.txt', '', [], context);

    await shellTask.run();

    expect(path.join(funTempDir, '1.txt')).to.be.a.file().with.content('aa\n');

    await context.teardown();

  });
});