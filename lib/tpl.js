'use strict';

const fs = require('fs');
const util = require('util');

const yaml = require('js-yaml');
const debug = require('debug')('fun:tpl');

const readFile = util.promisify(fs.readFile);

async function getTpl(tplPath) {

  const tplContent = await readFile(tplPath, 'utf8');
  const tpl = yaml.safeLoad(tplContent); 
  
  debug('exist tpl: %j', tpl);

  return tpl;
}

module.exports = getTpl;