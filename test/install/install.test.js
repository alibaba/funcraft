'use strict';

const path = require('path'),
  fs = require('fs');


const { installPackage, installFromYaml } = require('../../lib/install/install');
const { ShellTask } = require('../../lib/install/task');
const { hasDocker } = require('../conditions');
const tempDir = require('temp-dir');
const mkdirp = require('mkdirp-promise');

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-fs'));

(hasDocker ? describe : describe.skip)('Integration::install', () => {
  const funTempDir = path.join(tempDir, 'funtemp'); 
  const cleanTask = new ShellTask('clean task', 'python2.7', funTempDir, 'rm -rf ./{*,.[!.]*}');
  const ymlPath = path.join(funTempDir, 'fun.yml');

  beforeEach(async () => {
    await mkdirp(funTempDir);
    console.log('tempDir: %s', funTempDir);
  });

  afterEach(async function () {
    this.timeout(4000);
    await cleanTask.run();
  });

  it('install_apt', async function () {
    this.timeout(40000);

    await installPackage('python2.7', 'apt', 'libzbar0', {
      packageType: 'apt',
      codeUri: funTempDir,
      local: true,
      env: {}
    });

    expect(path.join(funTempDir, '.fun/root/usr/lib/libzbar.so.0')).to.be.a.path();
  });

  it('install_pip', async function () {
    this.timeout(20000);
    await installPackage('python2.7', 'pip', 'pymssql', {
      packageType: 'pip',
      codeUri: funTempDir,
      local: true,
      env: {}
    });

    expect(path.join(funTempDir, '.fun/python/lib/python2.7/site-packages/pymssql.so')).to.be.a.path();

  });

  it('install_from_yaml', async function () {
    this.timeout(30000);
    fs.writeFileSync(ymlPath, `
runtime: python2.7
tasks:
  - name: install pymssql localy by pip
    pip: pymssql
    local: true
  - name: install libzbar0 localy by apt-get
    apt: libzbar0
    local: true 
  - apt: libelfg0
  - shell: echo '111' > 1.txt
`);

    await installFromYaml(ymlPath);

    expect(path.join(funTempDir, '.fun/root/usr/lib/libzbar.so.0')).to.be.a.path();
    expect(path.join(funTempDir, '1.txt')).to.be.a.path();
  });


});