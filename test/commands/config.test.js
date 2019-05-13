'use strict';

const os = require('os');
const fs = require('fs');
const util = require('util');

const mkdirp = require('mkdirp-promise');
const rimraf = require('rimraf');
const yaml = require('js-yaml');
const expect = require('expect.js');

const mocki = require('../inquirer-mock-prompt');
const config = require('../../lib/commands/config');

const { setProcess } = require('../test-utils');

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

describe('config prompt', () => {

  let restoreProcess;

  before(async () => {

    restoreProcess = setProcess({
      HOME: os.tmpdir()
    });

    await mkdirp(`${os.homedir()}/.fcli/`);
    await writeFile(`${os.homedir()}/.fcli/config.yaml`, yaml.dump({
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

  after(async () => {
    rimraf.sync(`${os.homedir()}/.fcli/`);
    restoreProcess();
  });

  it('using default value', async () => {  
    mocki({});

    await config();

    const profContent = await readFile(`${os.homedir()}/.fcli/config.yaml`, 'utf8');
    const profYml = yaml.safeLoad(profContent);

    expect(profYml.endpoint).to.be('https://123344234.cn-hangzhou.fc.aliyuncs.com');
    expect(profYml.access_key_id).to.be('22222');
  });

  it('with partly setting', async () => {
    mocki({
      accountId: '3333555543',
      accessKeyId: '23r2fwefw',
      defaultRegion: 'cn-shanghai'
    });

    await config();

    const profContent = await readFile(`${os.homedir()}/.fcli/config.yaml`, 'utf8');
    const profYml = yaml.safeLoad(profContent);

    expect(profYml.endpoint).to.be('https://3333555543.cn-shanghai.fc.aliyuncs.com');
    expect(profYml.access_key_id).to.be('23r2fwefw');
  });
});

describe('config api_version', () => {

  let restoreProcess;

  before(async () => {

    restoreProcess = setProcess({
      HOME: os.tmpdir()
    });

    await mkdirp(`${os.homedir()}/.fcli/`);
    await writeFile(`${os.homedir()}/.fcli/config.yaml`, yaml.dump({
      endpoint: `https://33232.cn-hangzhou.fc.aliyuncs.com`,
      api_version: '2016-08-15T00:00:00.000Z',       
      access_key_id: '22222',
      access_key_secret: '3333333',
      security_token: '',
      user_agent: 'fcli-0.1',
      debug: false,
      timeout: 60,
      sls_endpoint: `cn-hangzhou.log.aliyuncs.com`
    }));
  });

  after(async () => {
    rimraf.sync(`${os.homedir()}/.fcli/`);
    restoreProcess();
  });

  it('config dateStr', async () => {  
    mocki({});
    await config();
    const profContent = await readFile(`${os.homedir()}/.fcli/config.yaml`, 'utf8');
    const profYml = yaml.safeLoad(profContent, {
      schema: yaml.JSON_SCHEMA
    });
    expect(profYml.api_version).to.be('2016-08-15');
  });
});

