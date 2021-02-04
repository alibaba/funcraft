'use strict';

const path = require('path');
const validate = require('../validate/validate');

const { red } = require('colors');
const { buildFunction } = require('../build/build');
const { showBuildNextTips } = require('../build/tips');
const { detectTplPath, getTpl, validateTplName } = require('../tpl');


async function build(buildName, options) {

  let tplPath = options.template;

  if (!tplPath) {
    tplPath = await detectTplPath(false);
  }

  const useDocker = options.useDocker;
  const useBuildkit = options.useBuildkit;
  const assumeYes = options.assumeYes;

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  validateTplName(tplPath);

  await validate(tplPath);

  const tpl = await getTpl(tplPath);

  const baseDir = path.dirname(tplPath);

  await buildFunction(buildName, tpl, baseDir, useDocker, useBuildkit, ['install', 'build'], options.verbose, tplPath, assumeYes);

  showBuildNextTips();
}

module.exports = build;
