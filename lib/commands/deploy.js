'use strict';

const { red } = require('colors');
const { ensureFilesModified } = require('../utils/file');
const { detectTplPath, validateTplName } = require('../tpl');

async function deploy(context) {
  let tplPath = context.template;

  if (!tplPath) {
    tplPath = await detectTplPath(true, ['template.packaged.yml']);
  }

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  validateTplName(tplPath);

  await ensureFilesModified(tplPath);

  await require('../deploy/deploy-by-tpl').deploy(tplPath, context);
}

module.exports = deploy;
