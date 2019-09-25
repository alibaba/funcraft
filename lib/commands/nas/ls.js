'use strict';

const lsNasFile = require('../../nas/ls');
const { parseNasUri } = require('../../nas/path');
const { detectTplPath, getTpl, validateYmlName } = require('../../tpl');
const { getDefaultService } = require('../../nas/support');
const path = require('path');
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
  const baseDir = path.dirname(tplPath);
  var { nasPath, serviceName } = await parseNasUri(nasDir); 
  // 此时 nasDir 的格式应为 nas://${ serviceName }${ mountDir }
  if (serviceName === '') {
    serviceName = getDefaultService(tpl);
  }
  await deployNasService(baseDir, tpl, serviceName);
  await lsNasFile(serviceName, nasPath, isAll, isLong);
}

module.exports = ls;
