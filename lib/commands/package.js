'use strict';

const path = require('path');
const detectTplPath = require('../tpl').detectTplPath;
const { red } = require('colors');

async function pack(options) {

  let tplPath = options.template;
  const bucket = options.ossBucket;
  const outputTemplateFile = options.outputTemplateFile;

  if (!bucket) {
    throw new Error('missing --oss-bucket parameter');
  }

  if (!tplPath) {
    tplPath = await detectTplPath();
  }

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  } else if (path.basename(tplPath).startsWith('template')) {
    await require('../package/package').pack(tplPath, bucket, outputTemplateFile);
  } else {
    console.log('The template file name must be template.[yml|yaml] or faas.[yml|yaml] .');
  }
}

module.exports = pack;
