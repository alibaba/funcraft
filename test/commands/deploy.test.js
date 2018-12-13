'use strict';

const util = require('util');
const exec = util.promisify(require('child_process').exec);

const expect = require('expect.js');

const deploy = require('../../lib/commands/deploy');

describe.skip('deploy template', () => {
  var prevCWD;
  beforeEach(() => {
    prevCWD = process.cwd();
    process.env.ACCOUNT_ID = 'testAccountId';
    process.env.ACCESS_KEY_ID = 'testKeyId';
    process.env.ACCESS_KEY_SECRET = 'testKeySecret';
   
  });
  afterEach(() => {
    process.chdir(prevCWD);
    delete process.env.ACCOUNT_ID;
    delete process.env.ACCESS_KEY_ID;
    delete process.env.ACCESS_KEY_SECRET;
  });

  it('deploy datahub example', async () => {
    process.chdir('./examples/datahub/');
    expect(await deploy()).to.be(undefined);
  });

  it('deploy helloworld example', async () => {
    process.chdir('./examples/helloworld/');
    await exec('npm install');
    expect(await deploy()).to.be(undefined);
  });

  it('deploy java example', async () => {
    process.chdir('./examples/java/');
    await exec('make build');
    expect(await deploy()).to.be(undefined);
    await exec('make clean');
  });

  it('deploy openid_connect example', async () => {
    process.chdir('./examples/openid_connect/');
    expect(await deploy()).to.be(undefined);
  });

  it('deploy tablestore-trigger example', async () => {
    process.chdir('./examples/tablestore-trigger/');
    expect(await deploy()).to.be(undefined);
  });

  it('deploy python example', async () => {
    process.chdir('./examples/python/');
    expect(await deploy()).to.be(undefined);
  });

  it('deploy segment example', async () => {
    process.chdir('./examples/segment/');
    expect(await deploy()).to.be(undefined);
  });

  it('deploy wechat example', async () => {
    process.chdir('./examples/wechat/');
    expect(await deploy()).to.be(undefined);
  });

  it('deploy timer example', async () => {
    process.chdir('./examples/timer/');
    expect(await deploy()).to.be(undefined);
  });


});