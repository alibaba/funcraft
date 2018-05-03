'use strict';


const fs = require('fs');
const util = require('util');
const path = require('path');

const yaml = require('js-yaml');
const debug = require('debug')('fun:conf');

const rootDir = process.cwd();

const readFile = util.promisify(fs.readFile);
const exists = util.promisify(fs.exists);

async function getConf(argv) {
  let fileName = argv.f || "faas.yml"

  var isexists = await exists(fileName);

  if (!isexists) {
    // try faas.yaml
    isexists = await exists(fileName);
  }

  if (!isexists) {
    console.log('Current folder not a Faas project');
    console.log('The folder must contains faas.yml or faas.yaml');
    process.exit(-1);
  }

  const confPath = path.resolve(fileName);
  const workDir = path.parse(confPath).dir;

  const confContent = await readFile(confPath, 'utf8');
  const conf = yaml.safeLoad(confContent);

  if (!conf.accountid) {
    debug('try to get ACCOUNT_ID from environment variable');
    conf.accountid = process.env.ACCOUNT_ID;
  }

  if (!conf.accessKeyId) {
    debug('try to get ACCESS_KEY_ID from environment variable');
    conf.accessKeyId = process.env.ACCESS_KEY_ID;
  }

  if (!conf.accessKeySecret) {
    debug('try to get ACCESS_KEY_SECRET from environment variable');
    conf.accessKeySecret = process.env.ACCESS_KEY_SECRET;
  }

  debug('exitst config: %j', conf);
  return { conf, dir: workDir };
}

module.exports = getConf;
