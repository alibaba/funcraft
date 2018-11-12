'use strict';

const path = require('path');
const detectTplPath = require('../tpl').detectTplPath;

const { red } = require('colors');

async function deploy(stage, tplPath) {

  if (!tplPath) {
    tplPath = await detectTplPath();
  }

  if (!tplPath) {
    console.error(red('Current folder not a fun project'));
    console.error(red('The folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
    process.exit(-1);
  } else if (path.basename(tplPath).startsWith('template')) {
    await require('../deploy/deploy-by-tpl')(tplPath);
  } else if (path.basename(tplPath).startsWith('faas')) {
    await require('../deploy/deploy-by-faas')(stage);
  } else {
    console.log('The template file name must be template.[yml|yaml] or faas.[yml|yaml] .');
  }

}

module.exports = deploy;
