'use strict';

const nasCp = require('../../nas/cp');
const { detectTplPath, getTpl, validateYmlName, getBaseDir } = require('../../tpl');
const validate = require('../../validate/validate');
const path = require('path');
const { red } = require('colors');

async function cp(srcPath, dstPath, options) {
  const tplPath = await detectTplPath(false);

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  validateYmlName(tplPath);
  
  await validate(tplPath);

  const tpl = await getTpl(tplPath);
  const baseDir = getBaseDir(tplPath);

  const recursive = options.recursive || false;
  const noClobber = !options.clobber || false;

  const localNasTmpDir = path.join(baseDir, '.fun', 'tmp', 'nas', 'cp');
  
  await nasCp(srcPath, dstPath, recursive, noClobber, localNasTmpDir, tpl, baseDir, false);
}

module.exports = cp;