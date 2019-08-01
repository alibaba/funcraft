'use strict';

const lsNasFile = require('../../nas/ls');
const { parseNasPath } = require('../../nas/path');
const { detectTplPath } = require('../../tpl');
const path = require('path');
const validate = require('../../validate/validate');

async function ls(nasDir, options) {

  const tplPath = await detectTplPath();

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  } else if (path.basename(tplPath).startsWith('template')) {
    await validate(tplPath);
    
    const allFlag = options.all;
    const listFlag = options.list;
     
    const { nasPath, serviceName } = await parseNasPath(nasDir); 
    
    await lsNasFile(serviceName, nasPath, allFlag, listFlag);
  } else {
    throw new Error(red('The template file name must be template.[yml|yaml].'));
  }
}

module.exports = ls;
