'use strict';

const path = require('path'),
  fs = require('fs');
const tempDir = require('temp-dir');
const mkdirp = require('mkdirp-promise');
const { ShellTask } = require('../../lib/install/task');
const { hasDocker } = require('../conditions');

const proxyquire = require('proxyquire');
const { init, install } = proxyquire('../../lib/commands/install', {
  inquirer: {
    prompt: async () => Promise.resolve({ runtime: 'python2.7' })
  }
});

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-fs'));

(hasDocker ? describe : describe.skip)('Integration::install', () => {
  const funTempDir = path.join(tempDir, 'funtemp');
  const cleanTask = new ShellTask('clean task', 'python2.7', funTempDir, 'rm -rf ./{*,.[!.]*}');
  const ymlPath = path.join(funTempDir, 'fun.yml');

  var prevCWD;
  beforeEach(async function () {
    prevCWD = process.cwd();
    await mkdirp(funTempDir);
    process.chdir(funTempDir);
  });
  afterEach(async function () {
    process.chdir(prevCWD);
    await cleanTask.run();
  });

  it('init', async () => {
    await init();

    expect(ymlPath).to.be.a.file().with.content('runtime: python2.7\ntasks: []\n');
  });

  it('pip_save', async function () {
    this.timeout(20000);

    await install(['pymssql'], {
      runtime: 'python2.7',
      packageType: 'pip',
      codeUri: process.cwd(),
      save: true
    });

    expect(ymlPath).to.be.a.file().with.content(`runtime: python2.7
tasks:
  - pip: pymssql
`);


  });

  it('apt_save', async function () {
    this.timeout(20000);
    fs.writeFileSync(ymlPath, `
runtime: python2.7
tasks:
  - pip: pymssql
`);


    await install(['libzbar0'], {
      runtime: 'python2.7',
      packageType: 'apt',
      codeUri: process.cwd(),
      save: true
    });

    expect(ymlPath).to.be.a.file().with.content(`runtime: python2.7
tasks:
  - pip: pymssql
  - apt: libzbar0
`);
  });
});