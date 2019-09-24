'use strict';

const path = require('path');
const { detectTplPath, validateYmlName } = require('../tpl');
const { red } = require('colors');

async function deploy(stage, context) {

  let tplPath = context.template;

  if (!tplPath) {
    tplPath = await detectTplPath(false, ['template.packaged.yml']);
  }

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  validateYmlName(tplPath);

  if (path.basename(tplPath).startsWith('faas')) {
    await require('../deploy/deploy-by-faas')(stage);
  } else {
    await require('../deploy/deploy-by-tpl').deploy(tplPath, context);
  }
}

module.exports = deploy;
