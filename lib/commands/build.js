'use strict';

const { detectTplPath, getTpl } = require('../tpl');
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
  } else if (path.basename(tplPath).startsWith('template')) {

    await validate(tplPath);

    const tpl = await getTpl(tplPath);

    const baseDir = path.dirname(tplPath);

    await buildFunction(buildName, tpl, baseDir, useDocker, options.verbose);
  } else {
    throw new Error(red('The template file name must be template.[yml|yaml].'));
  }
}

module.exports = build;
