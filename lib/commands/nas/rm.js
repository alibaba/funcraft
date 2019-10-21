'use strict';

const rmNasFile = require('../../nas/rm');
const { detectTplPath, getTpl, validateYmlName, getBaseDir } = require('../../tpl');
const { getNasId, getNasPathAndServiceFromNasUri } = require('../../nas/support');
const validate = require('../../validate/validate');
const { red } = require('colors');
const { deployNasService } = require('../../nas/init');
async function rm(nasDir, options) {

  const tplPath = await detectTplPath(false);

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  validateYmlName(tplPath);

  await validate(tplPath);
  const tpl = await getTpl(tplPath);

  const isRecursive = options.recursive;
  const isForce = options.force;
  const baseDir = getBaseDir(tplPath);
  
  const { nasPath, serviceName } = getNasPathAndServiceFromNasUri(nasDir, tpl);
  await deployNasService(baseDir, tpl, serviceName);
  
  const nasId = getNasId(tpl, serviceName);
  await rmNasFile(serviceName, nasPath, isRecursive, isForce, nasId);
}

module.exports = rm;
