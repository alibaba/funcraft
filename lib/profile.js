'use strict';

const fs = require('fs');
const util = require('util');
const path = require('path');
const os = require('os');

const yaml = require('js-yaml');
const debug = require('debug')('fun:profile');

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
  }

  if (profYml.access_key_id) {
    profile.accessKeyId = profYml.access_key_id;
  }

  if (profYml.access_key_secret) {
    profile.accessKeySecret = profYml.access_key_secret;
  }

  return profile;
}

async function getProfile() {
  const profile = await getProfileFromFile();

  if (process.env.ACCOUNT_ID) {
    debug('try to get ACCOUNT_ID from environment variable');
    profile.accountId = process.env.ACCOUNT_ID;
  }

  if (process.env.DEFAULT_REGION) {
    debug('try to get DEFAULT_REGION from environment variable');
    profile.defaultRegion = process.env.DEFAULT_REGION;
  }

  if (process.env.ACCESS_KEY_ID) {
    debug('try to get ACCESS_KEY_ID from environment variable');
    profile.accessKeyId = process.env.ACCESS_KEY_ID;
  }

  if (process.env.ACCESS_KEY_SECRET) {
    debug('try to get ACCESS_KEY_SECRET from environment variable');
    profile.accessKeySecret = process.env.ACCESS_KEY_SECRET;
  }

  if (!isAllRequiredExist(profile)) {
    console.warn('Fun is not properly configured.');
    console.warn('Please run `fun config` first.');
  }

  return profile;

}

module.exports = { getProfile, getProfileFromFile };