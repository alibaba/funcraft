'use strict';

const { getOssClient } = require('../client');
const { green, yellow } = require('colors');
const { getTpl, detectNasBaseDir, getNasYmlPath } = require('../tpl');
const { validateNasAndVpcConfig, SERVICE_RESOURCE, iterateResources, isNasAutoConfig, getUserIdAndGroupId } = require('../definition');

const nas = require('../nas');
const path = require('path');
const util = require('../import/utils');
const nasSupport = require('../nas/support');

const _ = require('lodash');

const {
  uploadLocalNasDir,
  transformFlowDefinition,
  uploadaUxiliaryFunction,
  generateRosTemplateForOutputs,
  uploadAndUpdateFunctionCode,
  generateRosTemplateForVpcConfig,
  generateRosTemplateForNasConfig,
  generateRosTemplateForResources,
  generateRosTemplateForParameters,
  generateRosTemplateForUxiliaryFunction
} = require('./template');

async function processNasAutoToRosTemplate(ossClient, tpl, bucketName, objectNames) {
  const cloneTpl = _.cloneDeep(tpl);

  const servicesNeedUpdate = [];
  iterateResources(cloneTpl.Resources, SERVICE_RESOURCE, (serviceName, serviceRes) => {
    const nasConfig = (serviceRes.Properties || {}).NasConfig;
    if (isNasAutoConfig(nasConfig)) {
      servicesNeedUpdate.push({
        serviceName,
        serviceRes
      });
    }
  });

  for (const { serviceRes } of servicesNeedUpdate) {
    const serviceProp = (serviceRes.Properties || {});
    const nasConfig = serviceProp.NasConfig;

    const { userId, groupId } = getUserIdAndGroupId(nasConfig);

    serviceProp.VpcConfig = generateRosTemplateForVpcConfig();
    serviceProp.NasConfig = generateRosTemplateForNasConfig(userId, groupId);
  }

  const codeUri = await uploadaUxiliaryFunction(ossClient);
  Object.assign(cloneTpl.Resources, generateRosTemplateForUxiliaryFunction(codeUri));

  Object.assign(cloneTpl.Resources, generateRosTemplateForResources(bucketName, objectNames));
  Object.assign(cloneTpl, generateRosTemplateForParameters());
  Object.assign(cloneTpl, generateRosTemplateForOutputs());

  return cloneTpl;
}

async function pack(tplPath, bucket, outputTemplateFile) {

  const tpl = await getTpl(tplPath);
  validateNasAndVpcConfig(tpl.Resources);

  const baseDir = path.dirname(tplPath);
  const ossClient = await getOssClient(bucket);

  const updatedTpl = await uploadAndUpdateFunctionCode(baseDir, tpl, ossClient);
  let updatedFlowTpl = await transformFlowDefinition(baseDir, updatedTpl);

  const nasPackageEnabled = false;
  if (nasPackageEnabled) {
    const serviceNasMapping = await nas.convertTplToServiceNasMappings(detectNasBaseDir(tplPath), updatedFlowTpl);
    const mergedNasMapping = await nasSupport.mergeNasMappingsInNasYml(getNasYmlPath(tplPath), serviceNasMapping);

    const objectNames = await uploadLocalNasDir(ossClient, baseDir, mergedNasMapping);
    updatedFlowTpl = await processNasAutoToRosTemplate(ossClient, updatedFlowTpl, bucket, objectNames);
  }

  let packedYmlPath;

  if (outputTemplateFile) {
    packedYmlPath = path.resolve(process.cwd(), outputTemplateFile);
  } else {
    packedYmlPath = path.join(process.cwd(), 'template.packaged.yml');
  }

  util.outputTemplateFile(packedYmlPath, updatedFlowTpl);

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