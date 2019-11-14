'use strict';

const lsNasFile = require('../../nas/ls');
const { detectTplPath, getTpl, validateYmlName, getBaseDir } = require('../../tpl');
const { getNasPathAndServiceFromNasUri } = require('../../nas/support');
const validate = require('../../validate/validate');
const { red } = require('colors');
const { deployNasService } = require('../../nas/init');

async function ls(nasDir, options) {

  const tplPath = await detectTplPath(false);
  
  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  validateYmlName(tplPath);

  await validate(tplPath);
  const tpl = await getTpl(tplPath);
  const isAll = options.all;
  const isLong = options.long;
  const baseDir = getBaseDir(tplPath);

  const { nasPath, serviceName } = getNasPathAndServiceFromNasUri(nasDir, tpl);
  await deployNasService(baseDir, tpl, serviceName, tplPath);
  await lsNasFile(serviceName, nasPath, isAll, isLong);
}

module.exports = ls;
