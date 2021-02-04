'use strict';
const { detectTplPath, validateTplName } = require('../tpl');
const { red } = require('colors');

async function pack(options) {

  let tplPath = options.template;
  const bucket = options.ossBucket;
  const useNas = options.useNas;
  const outputTemplateFile = options.outputTemplateFile;
  const pushRegistry = options.pushRegistry;

  if (!tplPath) {
    tplPath = await detectTplPath();
  }

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project.'));
  }

  validateTplName(tplPath);
  const assumeYes = options.assumeYes;
  await require('../package/package').pack(tplPath, bucket, outputTemplateFile, useNas, pushRegistry, assumeYes);
}

module.exports = pack;
