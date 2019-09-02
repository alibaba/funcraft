'use strict';

const { getTpl, detectTplPath } = require('../../tpl');
const { deployNasService } = require('../../nas/init');
const path = require('path');
const { red } = require('colors');
const validate = require('../../validate/validate');

async function init() {
  const tplPath = await detectTplPath(false);

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  } else if (path.basename(tplPath).startsWith('template')) {

    await validate(tplPath);

    const tpl = await getTpl(tplPath);
    const baseDir = path.dirname(tplPath);
    
    await deployNasService(baseDir, tpl);
  } else {
    throw new Error(red('The template file name must be template.[yml|yaml].'));
  }
}

module.exports = init;
