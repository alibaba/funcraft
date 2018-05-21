'use strict';

const fs = require('fs');
const util = require('util');

const yaml = require('js-yaml');
const Ajv = require('ajv');
const readFile = util.promisify(fs.readFile);

const schemas = require('./schema');

async function validate(tplPath) {

  const tplContent = await readFile(tplPath, 'utf8');
  const tpl = yaml.safeLoad(tplContent);
  
  const ajv = new Ajv({schemas});
  const valid = ajv.validate('/ROS', tpl);

  return { valid, ajv, tpl };
}

module.exports = validate;