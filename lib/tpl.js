'use strict';

const fs = require('fs');
const util = require('util');
const path = require('path');

const yaml = require('js-yaml');
const debug = require('debug')('fun:tpl');

const exists = util.promisify(fs.exists);

const readFile = util.promisify(fs.readFile);

async function detectTplPath() {

  const tplPath = ['template.yml', 'template.yaml', 'faas.yml', 'faas.yaml']
    .map((f) => path.join(process.cwd(), f));

  for (const path of tplPath) {
    if (await exists(path)) {
      return path;
    }
  }
  return null;
}

async function getTpl(tplPath) {

  const tplContent = await readFile(tplPath, 'utf8');
  const tpl = yaml.safeLoad(tplContent); 
  
  debug('exist tpl: %j', tpl);

  return tpl;
}

module.exports = {
  getTpl, detectTplPath
};