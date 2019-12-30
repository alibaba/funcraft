'use strict';

const { getOssClient } = require('../client');
const { green, yellow } = require('colors');
const { getTpl, detectNasBaseDir, getNasYmlPath } = require('../tpl');

const nas = require('../nas');
const path = require('path');
const util = require('../import/utils');
const template = require('./template');
const nasSupport = require('../nas/support');

async function pack(tplPath, bucket, outputTemplateFile) {
  const tpl = await getTpl(tplPath);

  const baseDir = path.dirname(tplPath);

  const ossClient = await getOssClient(bucket);

  let updatedTpl = await template.uploadAndUpdateFunctionCode(baseDir, tpl, ossClient);
  updatedTpl = await template.transformFlowDefinition(baseDir, updatedTpl);

  const serviceNasMapping = await nas.convertTplToServiceNasMappings(detectNasBaseDir(tplPath), tpl);
  const mergedNasMapping = await nasSupport.mergeNasMappingsInNasYml(getNasYmlPath(tplPath), serviceNasMapping);

  const nasPackageEnabled = false;

  if (nasPackageEnabled) {
    await template.uploadLocalNasDir(ossClient, baseDir, mergedNasMapping);
  }

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