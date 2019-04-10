'use strict';

const os = require('os');
const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');
const yaml = require('js-yaml');
const util = require('util');
const mkdirp = require('mkdirp-promise');

const { mark } = require('../profile');
const getProfile = require('../profile').getProfileFromFile;

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const exists = util.promisify(fs.exists);

async function config() {

  const profile = await getProfile();
  
  const markedAccessKeyId =  mark(profile.accessKeyId);
  const markedAccessKeySecret =  mark(profile.accessKeySecret);

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
      message: 'Aliyun Secret Access Key',
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
        if (typeof value !== 'number') {value = parseInt(value);}

        if ( ! Number.isNaN(value) ) {return value;}
        throw Error('timeout must be number');
      },
    },
    {
      type: 'input',
      name: 'retries',
      message: 'The maximum number of retries for each SDK client',
      default: profile.retries || 3,
      filter(value) {
        if (typeof value !== 'number') {value = parseInt(value);}

        if ( ! Number.isNaN(value) ) {return value;}
        throw Error('retries must be number');
      },
    }
  ];

  let newProf = await inquirer.prompt(questions);
  
  if(newProf.accessKeyId === markedAccessKeyId ){
    newProf.accessKeyId = profile.accessKeyId;
  }
  if(newProf.accessKeySecret === markedAccessKeySecret){
    newProf.accessKeySecret = profile.accessKeySecret;
  }

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
    profYml.timeout = newProf.timeout;
    profYml.retries = newProf.retries;
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
      sls_endpoint: `${newProf.defaultRegion}.log.aliyuncs.com`
    };

    await mkdirp(configDir);
  }

  await writeFile(profPath, yaml.dump(profYml));
}

module.exports = config;

