'use strict';

const { getTpl, detectTplPath, validateTplName, getBaseDir } = require('../../tpl');
const { deployNasService } = require('../../nas/init');
const { red } = require('colors');
const validate = require('../../validate/validate');

async function init() {
  const tplPath = await detectTplPath(false);

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  validateTplName(tplPath);

  await validate(tplPath);

  const tpl = await getTpl(tplPath);
  const baseDir = getBaseDir(tplPath);

  await deployNasService(baseDir, tpl, undefined, tplPath);
}

module.exports = init;
