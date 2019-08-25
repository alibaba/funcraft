'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const expect = require('expect.js');
const fs = require('fs-extra');
const path = require('path');

const mkdirp = require('mkdirp-promise');
const rimraf = require('rimraf');

const { addEnv } = require('../../lib/install/env');

describe('install_env', ()=>{

  it('no_settings', () => {
    const envs = addEnv({});

    expect(envs).to.have.property('PATH', '/code/.fun/root/usr/local/bin:/code/.fun/root/usr/local/sbin:/code/.fun/root/usr/bin:/code/.fun/root/usr/sbin:/code/.fun/root/sbin:/code/.fun/root/bin:/code/.fun/python/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/sbin:/bin');
    expect(envs).to.have.property('PYTHONUSERBASE', '/code/.fun/python');
    expect(envs).to.have.property('LD_LIBRARY_PATH', '/code/.fun/root/usr/lib:/code/.fun/root/usr/lib/x86_64-linux-gnu:/code:/code/lib:/usr/local/lib');
  });

  it('with_LD_LIBRARY_PATH', () => {
    const envs = addEnv({
      'LD_LIBRARY_PATH': '/usr/lib'
    });

    expect(envs).to.have.property('LD_LIBRARY_PATH', '/usr/lib:/code/.fun/root/usr/lib:/code/.fun/root/usr/lib/x86_64-linux-gnu:/code:/code/lib:/usr/local/lib');
  });

  it('with_PATH', () => {
    const envs = addEnv({
      'PATH': '/usr/bin'
    });

    expect(envs).to.have.property('PATH', '/usr/bin:/code/.fun/root/usr/local/bin:/code/.fun/root/usr/local/sbin:/code/.fun/root/usr/bin:/code/.fun/root/usr/sbin:/code/.fun/root/sbin:/code/.fun/root/bin:/code/.fun/python/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/sbin:/bin');
  });

  it('with_PYTHONUSERBASE', () => {
    const envs = addEnv({
      'PYTHONUSERBASE': '/mnt/nas/fun/python'
    });

    expect(envs).to.have.property('PYTHONUSERBASE', '/mnt/nas/fun/python');
  });
});

const file = {
  readLines: sandbox.stub()
};

const envStub = proxyquire('../../lib/install/env', {
  '../utils/file': file
});

describe('resolveLibPathsFromLdConf', () => {
  const confPath = '.fun/root/etc/ld.so.conf.d';
  const dirName = path.join(process.cwd(), confPath);
  const filePath = path.join(dirName, './test.conf');

  beforeEach(async () => {
    await mkdirp(dirName);
    await fs.createFile(filePath);
  });

  afterEach(() => {
    rimraf.sync(dirName);
  });
  
  it('path exist and front / for lines', async () => {

    file.readLines.returns(Promise.resolve(['/aaa']));
    const lines = await envStub.resolveLibPathsFromLdConf(process.cwd(), './');
    expect(lines).to.eql({ LD_LIBRARY_PATH: '/code/.fun/root/aaa' });

  });

  it('path exist and front / and blank for lines', async () => {

    file.readLines.returns(Promise.resolve(['   /blank']));
    const lines = await envStub.resolveLibPathsFromLdConf(process.cwd(), './');
    expect(lines).to.eql({ LD_LIBRARY_PATH: '/code/.fun/root/blank' });

  });

  it('path exist and nothing for lines', async () => {

    file.readLines.returns(Promise.resolve([]));
    const lines = await envStub.resolveLibPathsFromLdConf(process.cwd(), './');
    expect(lines).to.eql({});

  });
  
  it('Absolutely path exist and nothing for lines', async () => {

    file.readLines.returns(Promise.resolve([]));
    const lines = await envStub.resolveLibPathsFromLdConf(process.cwd(), './');
    expect(lines).to.eql({});

  });

  it('Absolutely path exist and front / for lines', async () => {

    file.readLines.returns(Promise.resolve(['/aaa']));
    const lines = await envStub.resolveLibPathsFromLdConf(process.cwd(), './');
    expect(lines).to.eql({ LD_LIBRARY_PATH: '/code/.fun/root/aaa' });

  });

  it('Absolutely path exist and front / and blank for lines', async () => {

    file.readLines.returns(Promise.resolve(['   /blank']));
    const lines = await envStub.resolveLibPathsFromLdConf(process.cwd(), './');
    expect(lines).to.eql({ LD_LIBRARY_PATH: '/code/.fun/root/blank' });

  });

  it('path exist and front / and blank for multiple lines', async () => {

    file.readLines.returns(Promise.resolve(['   /blank', 'lllll', 'ssssss']));
    const lines = await envStub.resolveLibPathsFromLdConf(process.cwd(), './');
    expect(lines).to.eql({ LD_LIBRARY_PATH: '/code/.fun/root/blank' });

  });

  it('Absolutely path exist and front / and blank for multiple lines', async () => {

    file.readLines.returns(Promise.resolve(['    /blank', 'aaa', 'bbb']));
    const lines = await envStub.resolveLibPathsFromLdConf(process.cwd(), './');
    expect(lines).to.eql({ LD_LIBRARY_PATH: '/code/.fun/root/blank' });

  });

  it('codeuri is file for resolve path', async () => {

    file.readLines.returns(Promise.resolve(['   /blank', 'lllll', 'ssssss']));
    const lines = await envStub.resolveLibPathsFromLdConf(process.cwd(), './.fun/root/etc/ld.so.conf.d');
    expect(lines).to.eql({});

  });

  it('codeuri is file for Absolutely path', async () => {

    file.readLines.returns(Promise.resolve(['    /blank', 'aaa', 'bbb']));
    const lines = await envStub.resolveLibPathsFromLdConf(process.cwd(), path.resolve('./'));
    expect(lines).to.eql({ LD_LIBRARY_PATH: '/code/.fun/root/blank' });
  });
});