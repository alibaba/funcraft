'use strict';

const fs = require('fs');
const util = require('util');
const path = require('path');

const yaml = require('js-yaml');
const debug = require('debug')('fun:tpl');
const { yellow } = require('colors');

const exists = util.promisify(fs.exists);

const readFile = util.promisify(fs.readFile);

async function asyncFind(pathArrays, filter) {
  for (let path of pathArrays) {
    if (await filter(path)) {
      return path;
    }
  }

  return null;
}

async function detectTplPath(preferBuildTpl = true) {

  let buildTemplate = [];

  if (preferBuildTpl) {
    buildTemplate = ['template.yml', 'template.yaml'].map(f => {
      return path.join(process.cwd(), '.fun', 'build', 'artifacts', f);
    });
  }

  const defaultTemplate = ['template.yml', 'template.yaml', 'faas.yml', 'faas.yaml']
    .map((f) => path.join(process.cwd(), f));

  const tplPath = await asyncFind([...buildTemplate, ...defaultTemplate], async (path) => {
    return await exists(path);
  });

  if (tplPath) {
    console.log(yellow(`using template: ${path.relative(process.cwd(), tplPath)}`));
  }

  return tplPath;
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