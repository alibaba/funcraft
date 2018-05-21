'use strict';

const os = require('os');
const fs = require('fs');
const util = require('util');

const expect = require('expect.js');
const yaml = require('js-yaml');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');

const getProfile = require('../lib/profile').getProfile;
const writeFile = util.promisify(fs.writeFile);


describe.skip('without local ~/.fcli/config.yml', () => {
  var prevHome;
  beforeEach(() => {
    prevHome = os.homedir();
    process.env.HOME = os.tmpdir();
  });
  afterEach(() => {
    process.env.HOME = prevHome;
    delete process.env.ACCOUNT_ID;
    delete process.env.ACCESS_KEY_ID;
    delete process.env.ACCESS_KEY_SECRET;
    delete process.env.DEFAULT_REGION;
  });


  it('with env', async () => {    
    process.env.ACCOUNT_ID = '111111';
    process.env.ACCESS_KEY_ID = '121111';
    process.env.ACCESS_KEY_SECRET = '111311';
    process.env.DEFAULT_REGION = '141111';
    const profile = await getProfile();
    expect(profile.accountId).to.be(process.env.ACCOUNT_ID);
    expect(profile.accessKeyId).to.be(process.env.ACCESS_KEY_ID);
    expect(profile.accessKeySecret).to.be(process.env.ACCESS_KEY_SECRET);
    expect(profile.defaultRegion).to.be(process.env.DEFAULT_REGION);
  });

  it('without env', async () => {
    const profile = await getProfile();
    expect(profile.accountId).to.be(undefined);
    expect(profile.accessKeyId).to.be(undefined);
    expect(profile.accessKeySecret).to.be(undefined);
    expect(profile.defaultRegion).to.be(undefined);
  });


});

describe('with local ~/.fcli/config.yml', () => {
  var prevHome;
  beforeEach(async () => {
    prevHome = os.homedir();
    process.env.HOME = os.tmpdir();

    await mkdirp(`${os.homedir}/.fcli/`);
    await writeFile(`${os.homedir}/.fcli/config.yaml`, yaml.dump({
      endpoint: `https://123344234.cn-hangzhou.fc.aliyuncs.com`,
      api_version: '2016-08-15',       
      access_key_id: '22222',
      access_key_secret: '3333333',
      security_token: '',
      user_agent: 'fcli-0.1',
      debug: false,
      timeout: 60,
      sls_endpoint: `cn-hangzhou.log.aliyuncs.com`
    }));
  });
  afterEach(async () => {
    rimraf.sync(`${os.homedir}/.fcli/`);

    process.env.HOME = prevHome;
    delete process.env.ACCOUNT_ID;
    delete process.env.ACCESS_KEY_ID;
    delete process.env.ACCESS_KEY_SECRET;
    delete process.env.DEFAULT_REGION;
  });

  it('with env', async () => {    
    process.env.ACCOUNT_ID = '111111';
    process.env.ACCESS_KEY_ID = '121111';
    process.env.ACCESS_KEY_SECRET = '111311';
    process.env.DEFAULT_REGION = '141111';
    const profile = await getProfile();
    expect(profile.accountId).to.be(process.env.ACCOUNT_ID);
    expect(profile.accessKeyId).to.be(process.env.ACCESS_KEY_ID);
    expect(profile.accessKeySecret).to.be(process.env.ACCESS_KEY_SECRET);
    expect(profile.defaultRegion).to.be(process.env.DEFAULT_REGION);
  });

  it('without env', async () => {
    const profile = await getProfile();
    expect(profile.accountId).to.be('123344234');
    expect(profile.accessKeyId).to.be('22222');
    expect(profile.accessKeySecret).to.be('3333333');
    expect(profile.defaultRegion).to.be('cn-hangzhou');
  });

});