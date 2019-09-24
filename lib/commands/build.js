'use strict';

const { detectTplPath, getTpl, validateYmlName } = require('../tpl');
const validate = require('../validate/validate');
const path = require('path');
const { red } = require('colors');
const { buildFunction } = require('../build/build');

async function build(buildName, options) {

  let tplPath = options.template;

  if (!tplPath) {
    tplPath = await detectTplPath(false);
  }

  const useDocker = options.useDocker;

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  } 

  validateYmlName(tplPath);

  await validate(tplPath);

  const tpl = await getTpl(tplPath);

  const baseDir = path.dirname(tplPath);

  await buildFunction(buildName, tpl, baseDir, useDocker, ['install', 'build'], options.verbose);
}

module.exports = build;
