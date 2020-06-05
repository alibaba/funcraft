'use strict';

const os = require('os');
const fs = require('fs-extra');
const expect = require('expect.js');
const yaml = require('js-yaml');
const rimraf = require('rimraf');
const getProfile = require('../lib/profile').getProfile;
const { setProcess } = require('./test-utils');

const { isShortDateStr } = require('../lib/profile');

describe('without local ~/.fcli/config.yaml', () => {

  let restoreProcess;
  beforeEach(() => {
    restoreProcess = setProcess({
      HOME: os.tmpdir()
    });
  });
  afterEach(() => {
    restoreProcess();
  });


  it('with env', async () => {
    process.env.ACCOUNT_ID = '111111';
    process.env.ACCESS_KEY_ID = '121111';
    process.env.ACCESS_KEY_SECRET = '111311';
    process.env.DEFAULT_REGION = '141111';
    process.env.TIMEOUT = 10;
    process.env.RETRIES = 2;
    process.env.ENABLE_CUSTOM_ENDPOINT = true;

    const profile = await getProfile();
    expect(profile.accountId).to.be(process.env.ACCOUNT_ID);
    expect(profile.accessKeyId).to.be(process.env.ACCESS_KEY_ID);
    expect(profile.accessKeySecret).to.be(process.env.ACCESS_KEY_SECRET);
    expect(profile.defaultRegion).to.be(process.env.DEFAULT_REGION);
    expect(profile.timeout).to.be(process.env.TIMEOUT);
    expect(profile.retries).to.be(process.env.RETRIES);
    expect(profile.enableCustomEndpoint).to.be(process.env.ENABLE_CUSTOM_ENDPOINT);
  });

  it('without env', (done) => {
    getProfile().then().catch(e => done());
  });
});

describe('with local ~/.fcli/config.yaml for endpoint https', () => {
  let restoreProcess;
  beforeEach(async () => {

    restoreProcess = setProcess({
      HOME: os.tmpdir()
    });

    await fs.mkdirp(`${process.env.HOME}/.fcli/`);
    await fs.writeFile(`${process.env.HOME}/.fcli/config.yaml`, yaml.dump({
      endpoint: `https://123344234.cn-hangzhou.fc.aliyuncs.com`,
      api_version: '2016-08-15',
      access_key_id: '22222',
      access_key_secret: '3333333',
      security_token: '',
      user_agent: 'fcli-0.1',
      debug: false,
      timeout: 60,
      sls_endpoint: `cn-hangzhou.log.aliyuncs.com`,
      retries: 10,
      enable_custom_endpoint: false
    }));
  });

  afterEach(async () => {
    rimraf.sync(`${process.env.HOME}/.fcli/`);

    restoreProcess();
  });

  it('with env', async () => {
    process.env.ACCOUNT_ID = '111111';
    process.env.ACCESS_KEY_ID = '121111';
    process.env.ACCESS_KEY_SECRET = '111311';
    process.env.DEFAULT_REGION = '141111';
    process.env.TIMEOUT = 10;
    process.env.RETRIES = 2;

    const profile = await getProfile();
    expect(profile.accountId).to.be(process.env.ACCOUNT_ID);
    expect(profile.accessKeyId).to.be(process.env.ACCESS_KEY_ID);
    expect(profile.accessKeySecret).to.be(process.env.ACCESS_KEY_SECRET);
    expect(profile.defaultRegion).to.be(process.env.DEFAULT_REGION);
    expect(profile.timeout).to.be(process.env.TIMEOUT);
    expect(profile.retries).to.be(process.env.RETRIES);
    expect(profile.protocol).to.be('https');
    expect(profile.enableCustomEndpoint).to.be(false);
  });

  it('without env', async () => {
    const profile = await getProfile();
    expect(profile.accountId).to.be('123344234');
    expect(profile.accessKeyId).to.be('22222');
    expect(profile.accessKeySecret).to.be('3333333');
    expect(profile.defaultRegion).to.be('cn-hangzhou');
    expect(profile.timeout).to.be(60);
    expect(profile.retries).to.be(10);
    expect(profile.protocol).to.be('https');
    expect(profile.enableCustomEndpoint).to.be(false);
  });

  it('pattern', ()=>{
    const correctValue = isShortDateStr('2017-09-09');
    const notCorrectValue = isShortDateStr('2017/09/09');
    expect(correctValue).to.be(true);
    expect(notCorrectValue).to.be(false);
  });
});

describe('with local ~/.fcli/config.yaml for endpoint http', () => {
  let restoreProcess;
  beforeEach(async () => {

    restoreProcess = setProcess({
      HOME: os.tmpdir()
    });

    await fs.mkdirp(`${process.env.HOME}/.fcli/`);
    await fs.writeFile(`${process.env.HOME}/.fcli/config.yaml`, yaml.dump({
      endpoint: `http://123344234.cn-hangzhou.fc.aliyuncs.com`,
      api_version: '2016-08-15',
      access_key_id: '22222',
      access_key_secret: '3333333',
      security_token: '',
      user_agent: 'fcli-0.1',
      debug: false,
      timeout: 60,
      sls_endpoint: `cn-hangzhou.log.aliyuncs.com`,
      retries: 10,
      enable_custom_endpoint: false
    }));
  });

  afterEach(async () => {
    rimraf.sync(`${process.env.HOME}/.fcli/`);
    restoreProcess();
  });

  it('with env', async () => {
    process.env.ACCOUNT_ID = '111111';
    process.env.ACCESS_KEY_ID = '121111';
    process.env.ACCESS_KEY_SECRET = '111311';
    process.env.DEFAULT_REGION = '141111';
    process.env.TIMEOUT = 10;
    process.env.RETRIES = 2;
    process.env.ENABLE_CUSTOM_ENDPOINT = true;

    const profile = await getProfile();
    expect(profile.accountId).to.be(process.env.ACCOUNT_ID);
    expect(profile.accessKeyId).to.be(process.env.ACCESS_KEY_ID);
    expect(profile.accessKeySecret).to.be(process.env.ACCESS_KEY_SECRET);
    expect(profile.defaultRegion).to.be(process.env.DEFAULT_REGION);
    expect(profile.timeout).to.be(process.env.TIMEOUT);
    expect(profile.retries).to.be(process.env.RETRIES);
    expect(profile.protocol).to.be('http');
    expect(profile.enableCustomEndpoint).to.be(true);
  });

  it('without env', async () => {
    const profile = await getProfile();
    expect(profile.accountId).to.be('123344234');
    expect(profile.accessKeyId).to.be('22222');
    expect(profile.accessKeySecret).to.be('3333333');
    expect(profile.defaultRegion).to.be('cn-hangzhou');
    expect(profile.timeout).to.be(60);
    expect(profile.retries).to.be(10);
    expect(profile.protocol).to.be('http');
    expect(profile.enableCustomEndpoint).to.be(false);
  });
});