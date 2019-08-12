'use strict';

const fs = require('fs');
const util = require('util');
const path = require('path');
const os = require('os');

const yaml = require('js-yaml');
const debug = require('debug')('fun:profile');

const { red } = require('colors');

const _ = require('lodash');

const dotenv = require('dotenv').config();

const readFile = util.promisify(fs.readFile);
const exists = util.promisify(fs.exists);

function isAllRequiredExist(profile) {
  const props = ['accountId', 'accessKeyId', 'accessKeySecret'];
  return props.every((item) => {
    return profile.hasOwnProperty(item);
  });
}

function extract(regex, endpoint) {
  var matchs = endpoint.match(regex);
  if (matchs) {
    return matchs[1];
  }
  return null;
}

function extractAccountId(endpoint) {
  return extract(/^https?:\/\/([^.]+)\..+$/, endpoint);
}

function extractRegion(endpoint) {
  return extract(/^https?:\/\/[^.]+\.([^.]+)\..+$/, endpoint);
}

function extractProtocol(endpoint) {
  const array = _.split(endpoint, ':', 1);
  return array.length !== 0 ? array[0] : '';
}


async function getProfileFromFile() {
  const profPath = path.join(os.homedir(), '.fcli/config.yaml');
  const isExists = await exists(profPath);

  var profile = {};

  if (!isExists) {
    return profile;
  }

  const profContent = await readFile(profPath, 'utf8');
  const profYml = yaml.safeLoad(profContent);

  if (profYml.endpoint) {
    profile.accountId = extractAccountId(profYml.endpoint);
    profile.defaultRegion = extractRegion(profYml.endpoint);
    profile.protocol = extractProtocol(profYml.endpoint);
  }

  if (profYml.access_key_id) {
    profile.accessKeyId = profYml.access_key_id;
  }

  if (profYml.access_key_secret) {
    profile.accessKeySecret = profYml.access_key_secret;
  }

  if (profYml.report !== undefined) {
    profile.report = profYml.report;
  }

  profile.timeout = profYml.timeout || 10;
  profile.retries = profYml.retries || 3;

  return profile;
}

async function getProfileFromEnv() {
  const profile = await getProfileFromFile();
  
  if (process.env.ACCOUNT_ID) {
    debug('try to get ACCOUNT_ID from environment variable');
    profile.accountId = process.env.ACCOUNT_ID;
  }

  if (process.env.DEFAULT_REGION) {
    debug('try to get DEFAULT_REGION from environment variable');
    profile.defaultRegion = process.env.DEFAULT_REGION;
  }

  if (process.env.REGION) {
    debug('try to get REGION from environment variable');
    profile.defaultRegion = process.env.REGION;
  }

  if (process.env.ACCESS_KEY_ID) {
    debug('try to get ACCESS_KEY_ID from environment variable');
    profile.accessKeyId = process.env.ACCESS_KEY_ID;
  }

  if (process.env.ACCESS_KEY_SECRET) {
    debug('try to get ACCESS_KEY_SECRET from environment variable');
    profile.accessKeySecret = process.env.ACCESS_KEY_SECRET;
  }

  if (process.env.TIMEOUT) {
    debug('try to get TIMEOUT from environment variable');
    profile.timeout = process.env.TIMEOUT;    
  }

  if (process.env.RETRIES) {
    debug('try to get RETRIES from environment variable');
    profile.retries = process.env.RETRIES;
  }

  if (process.env.FC_ENDPOINT) {
    debug('try to get ENDPOINT from environment variable');
    profile.fcEndpoint = process.env.FC_ENDPOINT;
  }

  return profile;
}

async function getProfileFromDotEnv() {
  const profile = await getProfileFromEnv();
  
  if (dotenv) {
    if (dotenv.error) {
      debug('could not found .env file, so ignore'); // dotenv file may not exist.
      return profile;
    }

    const parsed = dotenv.parsed;

    if (parsed['ACCOUNT_ID']) {
      debug('try to get ACCOUNT_ID from dotenv variable');
      profile.accountId = parsed['ACCOUNT_ID'];
    }

    if (parsed['DEFAULT_REGION']) {
      debug('try to get DEFAULT_REGION from dotenv variable');
      profile.defaultRegion = parsed['DEFAULT_REGION'];
    }

    if (parsed['REGION']) {
      debug('try to get REGION from dotenv variable');
      profile.defaultRegion = parsed['REGION'];
    }
  
    if (parsed['ACCESS_KEY_ID']) {
      debug('try to get ACCESS_KEY_ID from dotenv variable');
      profile.accessKeyId = parsed['ACCESS_KEY_ID'];
    }
  
    if (parsed['ACCESS_KEY_SECRET']) {
      debug('try to get ACCESS_KEY_SECRET from dotenv variable');
      profile.accessKeySecret = parsed['ACCESS_KEY_SECRET'];
    }

    if (parsed['TIMEOUT']) {
      debug('try to get TIMEOUT from dotenv variable');
      profile.timeout = parsed['TIMEOUT'];
    }

    if (parsed['RETRIES']) {
      debug('try to get RETRIES from dotenv variable');
      profile.retries = parsed['RETRIES'];
    }

    if (parsed['FC_ENDPOINT']) {
      debug('try to get FC_ENDPOINT from dotenv variable');
      profile.fcEndpoint = parsed['FC_ENDPOINT'];
    }
  }

  return profile;
}

async function getProfile() {
  const profile = await getProfileFromDotEnv();

  if (!isAllRequiredExist(profile)) {
    console.error(red(''));
    console.error(red(''));
    throw new Error(red('Fun is not properly configured.\nPlease run `fun config` first.'));
  }

  return profile;
}

function mark(source) {
  if (!source) { return source; }

  const subStr = source.slice(-4);
  return `***********${subStr}`;
}

function isShortDateStr(str) { //example:2008-07-22
  var dateFormat = /^\d{4}-\d{2}-\d{2}$/;
  if (dateFormat.test(str)) {
    return true;
  } 
  return false;
    
}
module.exports = { getProfile, getProfileFromFile, mark, isShortDateStr };