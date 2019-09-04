'use strict';

const { getOssClient } = require('../client');
const { getTpl } = require('../tpl');
const path = require('path');

const util = require('../import/utils');
const { green, yellow } = require('colors');
const template = require('./template');

async function pack(tplPath, bucket, outputTemplateFile) {
  const tpl = await getTpl(tplPath);

  const baseDir = path.dirname(tplPath);

  const ossClient = await getOssClient(bucket);

  const updatedTpl = await template.uploadAndUpdateFunctionCode(baseDir, tpl, ossClient);

  let packedYmlPath;

  if (outputTemplateFile) {
    packedYmlPath = path.resolve(process.cwd(), outputTemplateFile);
  } else {
    packedYmlPath = path.join(process.cwd(), 'template.packaged.yml');
  }

  util.outputTemplateFile(packedYmlPath, updatedTpl);

  console.log(green('\nPackage success'));

  showPackageNextTips(packedYmlPath);
}

function showPackageNextTips(packedYmlPath) {
  const deployTip = 'fun deploy';

  const relative = path.relative(process.cwd(), packedYmlPath);

  let templateParam = '';

  const DEFAULT_PACKAGED_YAML_NAME = 'template.packaged.yml';

  if (relative !== DEFAULT_PACKAGED_YAML_NAME) {
    templateParam = ` -t ${relative}`;
  }

  console.log(yellow(`\nTips for next step
======================
* Deploy Resources: ${deployTip}${templateParam}`));
}

module.exports = {
  pack
};