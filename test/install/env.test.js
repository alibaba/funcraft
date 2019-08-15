'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const expect = require('expect.js');

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

const fs = {
  existsSync: sandbox.stub(),
  readdirSync: sandbox.stub()
};

const file = {
  readLines: sandbox.stub()
};

const envStub = proxyquire('../../lib/install/env', {
  'fs-extra': fs,
  '../fc-utils/fc-fun-nas-server/lib/file': file
});

describe.only('resolveLibPathsFromLdConf', () => {

  afterEach(() => {
    sandbox.reset();
  });

  it('resolveLibPathsFromLdConf with path exist', async () => {

    fs.existsSync.returns(true);
    fs.readdirSync.returns(['a.conf', 'b.conf']);
    file.readLines.returns(Promise.resolve(['/aaa']));

    const lines = await envStub.resolveLibPathsFromLdConf(process.cwd(), './');

    expect(lines).to.eql({
      LD_LIBRARY_PATH: '/code/.fun/root/code/.fun/root/aaa:/code/.fun/root/code/.fun/root/aaa'});
  });

  it('resolveLibPathsFromLdConf with path not exist', async () => {

    fs.existsSync.returns(false);
    const lines = await envStub.resolveLibPathsFromLdConf(process.cwd(), './');
    expect(lines).to.eql({});
  });

  it('resolveLibPathsFromLdConf with front blank for line', async () => {

    fs.existsSync.returns(true);
    fs.readdirSync.returns(['a.conf', 'b.conf']);
    file.readLines.returns(Promise.resolve(['      /blank']));
    const lines = await envStub.resolveLibPathsFromLdConf(process.cwd(), './');
    expect(lines).to.eql({
      LD_LIBRARY_PATH: '/code/.fun/root/code/.fun/root/blank:/code/.fun/root/code/.fun/root/blank'});  
  });

});