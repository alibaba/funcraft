'use strict';

const os = require('os');
const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');
const yaml = require('js-yaml');
const util = require('util');
const mkdirp = require('mkdirp-promise');

const { mark } = require('../profile');
const { isShortDateStr } = require('../profile');
const getProfileFromFile = require('../profile').getProfileFromFile;

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const exists = util.promisify(fs.exists);

async function config() {

  const profile = await getProfileFromFile();

  const markedAccessKeyId = mark(profile.accessKeyId);
  const markedAccessKeySecret = mark(profile.accessKeySecret);

  const questions = [
    {
      type: 'input',
      name: 'accountId',
      message: 'Aliyun Account ID',
      default: profile.accountId
    },
    {
      type: 'input',
      name: 'accessKeyId',
      message: 'Aliyun Access Key ID',
      default: markedAccessKeyId
    },
    {
      type: 'input',
      name: 'accessKeySecret',
      message: 'Aliyun Access Key Secret',
      default: markedAccessKeySecret
    },
    {
      type: 'list',
      name: 'defaultRegion',
      message: 'Default region name',
      choices: ['cn-qingdao', 'cn-beijing', 'cn-zhangjiakou',
        'cn-hangzhou', 'cn-shanghai', 'cn-shenzhen', 'cn-huhehaote',
        'cn-hongkong', 'ap-southeast-1', 'ap-southeast-2',
        'ap-northeast-1', 'us-west-1', 'us-east-1',
        'eu-central-1', 'ap-south-1'],
      default: profile.defaultRegion
    },
    {
      type: 'input',
      name: 'timeout',
      message: 'The timeout in seconds for each SDK client invoking',
      default: profile.timeout || 10,
      filter(value) {
        if (typeof value !== 'number') { value = parseInt(value); }

        if ( ! Number.isNaN(value) ) { return value; }
        throw Error('timeout must be number');
      }
    },
    {
      type: 'input',
      name: 'retries',
      message: 'The maximum number of retries for each SDK client',
      default: profile.retries || 3,
      filter(value) {
        if (typeof value !== 'number') { value = parseInt(value); }

        if ( ! Number.isNaN(value) ) { return value; }
        throw Error('retries must be number');
      }
    },
    {
      type: 'confirm',
      name: 'report',
      default: profile.report === undefined ? true : profile.report,
      message: 'Allow to anonymously report usage statistics to improve the tool over time?'
    }
  ];

  let newProf = await inquirer.prompt(questions);

  if (newProf.accessKeyId === markedAccessKeyId ) {
    newProf.accessKeyId = profile.accessKeyId;
  }
  if (newProf.accessKeySecret === markedAccessKeySecret) {
    newProf.accessKeySecret = profile.accessKeySecret;
  }

  const configDir = path.join(os.homedir(), '.fcli');

  const profPath = path.join(configDir, 'config.yaml');
  const isExists = await exists(profPath);

  var profYml;

  if (isExists) {
    const profContent = await readFile(profPath, 'utf8');
    profYml = yaml.safeLoad(profContent, {
      schema: yaml.JSON_SCHEMA
    });
    profYml.endpoint = `https://${newProf.accountId}.${newProf.defaultRegion}.fc.aliyuncs.com`;
    profYml.access_key_id = newProf.accessKeyId;
    profYml.access_key_secret = newProf.accessKeySecret;
    profYml.sls_endpoint = `${newProf.defaultRegion}.log.aliyuncs.com`;
    profYml.timeout = newProf.timeout;
    profYml.retries = newProf.retries;
    profYml.report = newProf.report;

    if (!isShortDateStr(profYml.api_version)) {
      // 1. fcli 默认配置的格式为 api_version: 2016-08-15
      // 2. js-yaml 在没有配置 schema: yaml.JSON_SCHEMA 时，会将其按照日期解析
      // 3. js-yaml dump 后，生成的内容为： 2016-08-15T00:00:00.000Z，然后会被写入 config.yaml
      // 4. fcli 读取到这个配置会导致请求出错

      // 这里做到了以下三种格式，最终都被格式化成 ‘2016-08-15’：

      // 1. 兼容 2016-08-15
      // 2. 兼容 ‘2016-08-15’
      // 3. 兼容 2016-08-15T00:00:00.000Z
      profYml.api_version = profYml.api_version.slice(0, 10);
    }
  } else {
    profYml = {
      endpoint: `https://${newProf.accountId}.${newProf.defaultRegion}.fc.aliyuncs.com`,
      api_version: '2016-08-15',
      access_key_id: newProf.accessKeyId,
      access_key_secret: newProf.accessKeySecret,
      security_token: '',
      debug: false,
      timeout: newProf.timeout,
      retries: newProf.retries,
      sls_endpoint: `${newProf.defaultRegion}.log.aliyuncs.com`,
      report: newProf.report
    };
    await mkdirp(configDir);
  }

  await writeFile(profPath, yaml.dump(profYml), {
    mode: parseInt('0600', 8)
  });
}
module.exports = config;

