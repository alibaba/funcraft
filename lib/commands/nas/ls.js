'use strict';

const lsNasFile = require('../../nas/ls');
const { parseNasUri } = require('../../nas/path');
const { detectTplPath } = require('../../tpl');
const { getDefaultService } = require('../../nas/support');
const path = require('path');
const validate = require('../../validate/validate');
const { red } = require('colors');

async function ls(nasDir, options) {

  const tplPath = await detectTplPath(false);

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  } else if (path.basename(tplPath).startsWith('template')) {
    await validate(tplPath);
    
    const isAll = options.all;
    const isLong = options.long;
    
    var { nasPath, serviceName } = await parseNasUri(nasDir); 
    // 此时 nasDir 的格式应为 nas://${ serviceName }${ mountDir }
    if (serviceName === '') {
      serviceName = await getDefaultService(tplPath);
    }
    await lsNasFile(serviceName, nasPath, isAll, isLong);
  } else {
    throw new Error(red('The template file name must be template.[yml|yaml].'));
  }
}

module.exports = ls;
