'use strict';

const { PipTask, AptTask, ShellTask } = require('../../lib/install/task');
const Context = require('../../lib/install/context');
const { hasDocker } = require('../conditions');
const tempDir = require('temp-dir');
const path = require('path');
const mkdirp = require('mkdirp-promise');
const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-fs'));


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
    const pipTask = new PipTask('install pymssql', 'python2.7', funTempDir, 'pymssql', false, context);
    await pipTask.run();

    await context.teardown();
  });

  it('apt_local', async function () {
    this.timeout(30000);

    const aptTask = new AptTask('install libsybdb5', 'python3', funTempDir, 'libsybdb5', true);
    await aptTask.run();

    const installedDir = path.join(funTempDir, '.fun/root/usr/lib/x86_64-linux-gnu/');

    expect(installedDir).to.be.a.directory().with.files(['libsybdb.so.5', 'libsybdb.so.5.0.0']);

  });

  it('apt_global', async function () {
    this.timeout(20000);

    const context = await new Context('python3', funTempDir);

    const aptTask = new AptTask('install libsybdb5', 'python3', funTempDir, 'libsybdb5', false, context);
    await aptTask.run();

    await context.teardown();

  });

  it('shell', async function () {
    this.timeout(10000);

    const context = await new Context('python3', funTempDir);

    const shellTask = new ShellTask(undefined, 'python3', funTempDir, 'echo \'aa\' > 1.txt', context);

    await shellTask.run();

    expect(path.join(funTempDir, '1.txt')).to.be.a.file().with.content('aa\n');

    await context.teardown();

  });
});