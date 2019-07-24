'use strict';

const path = require('path');
const detectTplPath = require('../tpl').detectTplPath;
const { red } = require('colors');

async function deploy(stage, context) {

  let tplPath = context.template;

  if (!tplPath) {
    tplPath = await detectTplPath();
  }

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  } else if (path.basename(tplPath).startsWith('template')) {
    await require('../deploy/deploy-by-tpl').deploy(tplPath, context);
  } else if (path.basename(tplPath).startsWith('faas')) {
    await require('../deploy/deploy-by-faas')(stage);
  } else {
    console.log('The template file name must be template.[yml|yaml] or faas.[yml|yaml] .');
  }
}

module.exports = deploy;
