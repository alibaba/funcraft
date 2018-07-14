'use strict';

const os = require('os');
const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');
const yaml = require('js-yaml');
const util = require('util');
const mkdirp = require('mkdirp');

const getProfile = require('../profile').getProfileFromFile;

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const exists = util.promisify(fs.exists);

async function config() {
  const profile = await getProfile();

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
      default: profile.accessKeyId
    },
    {
      type: 'input',
      name: 'accessKeySecret',
      message: 'Aliyun Secret Access Key',
      default: profile.accessKeySecret
    },
    {
      type: 'list',
      name: 'defaultRegion',
      message: 'Default region name',
      choices: ['cn-beijing', 'cn-hangzhou', 'cn-shanghai', 'cn-shenzhen' , 'cn-hongkong',
        'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'eu-central-1'],
      default: profile.defaultRegion
    }
  ];

  const newProf = await inquirer.prompt(questions);
  const configDir = path.join(os.homedir(), '.fcli');

  const profPath = path.join(configDir, 'config.yaml');
  const isExists = await exists(profPath);

  var profYml;

  if (isExists) {
    const profContent = await readFile(profPath, 'utf8');
    profYml = yaml.safeLoad(profContent);
    profYml.endpoint = `https://${newProf.accountId}.${newProf.defaultRegion}.fc.aliyuncs.com`;
    profYml.access_key_id = newProf.accessKeyId;
    profYml.access_key_secret = newProf.accessKeySecret;
    profYml.sls_endpoint = `${newProf.defaultRegion}.log.aliyuncs.com`;
  } else {
    profYml = {
      endpoint: `https://${newProf.accountId}.${newProf.defaultRegion}.fc.aliyuncs.com`,
      api_version: '2016-08-15',
      access_key_id: newProf.accessKeyId,
      access_key_secret: newProf.accessKeySecret,
      security_token: '',
      user_agent: 'fcli-0.1',
      debug: false,
      timeout: 60,
      sls_endpoint: `${newProf.defaultRegion}.log.aliyuncs.com`
    };

    await mkdirp(configDir);
  }

  await writeFile(profPath, yaml.dump(profYml));

}

module.exports = config;

