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
    throw new Error(red('Current folder not a fun project.'));
  } else if (path.basename(tplPath).endsWith('.yml') || path.basename(tplPath).endsWith('.yaml')) {
    await require('../package/package').pack(tplPath, bucket, outputTemplateFile);
  } else {
    console.log(`The -t argument:${tplPath} must end in '.[yml|yaml]'.`);
  }
}

module.exports = pack;
