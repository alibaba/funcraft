'use strict';

const util = require('util');
const exec = util.promisify(require('child_process').exec);

const expect = require('expect.js');

const {setProcess} = require('../test-utils');

const deploy = require('../../lib/commands/deploy');

describe.skip('deploy template', () => {

  let restoreProcess;

  beforeEach(() => {
    restoreProcess = setProcess({
      ACCOUNT_ID: 'testAccountId',
      ACCESS_KEY_ID: 'testKeyId',
      ACCESS_KEY_SECRET: 'testKeySecret'
    });

  });
  afterEach(() => {
    restoreProcess();
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

  it('could deploy spring boot gradle example without providing a template.yaml', async () => {
    process.chdir('./examples/spring-boot-gradle-demo/');
    expect(await deploy()).to.be(undefined);
  });
});