'use strict';

const os = require('os');
const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');
const yaml = require('js-yaml');
const util = require('util');

const getProfile = require('../profile').getProfileFromFile;

const writeFile = util.promisify(fs.writeFile);

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
      choices: ['cn-beijing','cn-shanghai','cn-shenzhen', 'ap-southeast-2', 'cn-hangzhou'],
      default: profile.defaultRegion
    }
  ];

  const newProf = await inquirer.prompt(questions);
  const profPath = path.join(os.homedir(), '.fcli/config.yaml');

  await writeFile(profPath, yaml.dump({
    endpoint: `https://${newProf.accountId}.${newProf.defaultRegion}.fc.aliyuncs.com`,
    api_version: '2016-08-15',       
    access_key_id: newProf.accessKeyId,
    access_key_secret: newProf.accessKeySecret,
    security_token: '',
    user_agent: 'fcli-0.1',
    debug: false,
    timeout: 60,
    sls_endpoint: `${newProf.defaultRegion}.log.aliyuncs.com`
  }));

}

module.exports = config;

