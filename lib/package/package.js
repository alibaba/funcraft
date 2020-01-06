'use strict';

const { isEmptyDir } = require('../nas/cp/file');
const { getOssClient } = require('../client');
const { red, green, yellow } = require('colors');
const { getTpl, detectNasBaseDir, getNasYmlPath } = require('../tpl');
const { validateNasAndVpcConfig, SERVICE_RESOURCE, iterateResources, isNasAutoConfig, getUserIdAndGroupId } = require('../definition');

const fs = require('fs-extra');
const fc = require('../fc');
const nas = require('../nas');
const path = require('path');
const util = require('../import/utils');
const nasSupport = require('../nas/support');

const _ = require('lodash');

const {
  zipToOss,
  transformFlowDefinition,
  uploadNasService,
  generateRosTemplateForOutputs,
  uploadAndUpdateFunctionCode,
  generateRosTemplateForRegionMap,
  generateRosTemplateForVpcConfig,
  generateRosTemplateForNasConfig,
  generateRosTemplateForResources,
  generateRosTemplateForNasService
} = require('./template');

async function processNasAutoToRosTemplate(ossClient, tpl, baseDir, bucketName, serviceNasMapping) {
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

  const objectNames = [];

  for (const { serviceName, serviceRes } of servicesNeedUpdate) {
    const serviceProp = (serviceRes.Properties || {});
    const nasConfig = serviceProp.NasConfig;

    const { userId, groupId } = getUserIdAndGroupId(nasConfig);

    serviceProp.VpcConfig = generateRosTemplateForVpcConfig();
    serviceProp.NasConfig = generateRosTemplateForNasConfig(userId, groupId);

    for (const { localNasDir, remoteNasDir } of serviceNasMapping[serviceName]) {
      const srcPath = path.resolve(baseDir, localNasDir);

      if (!await fs.pathExists(srcPath)) {
        console.warn(red(`\nwarning: ${srcPath} is not exist, skiping.`));
        continue;
      }
      if (await isEmptyDir(srcPath)) {
        console.warn(red(`\nwarning: ${srcPath} is empty directory, skiping.`));
        continue;
      }
      const mountDir = fc.parseMountDirPrefix(nasConfig);
      const prefix = path.relative(mountDir, remoteNasDir);

      const objectName = await zipToOss(ossClient, srcPath, null, 'nas.zip', prefix);
      if (objectName) {
        objectNames.push(objectName);
      }
    }
  }

  const codeUri = await uploadNasService(ossClient);
  Object.assign(cloneTpl.Resources, generateRosTemplateForNasService(codeUri, bucketName, objectNames));
  Object.assign(cloneTpl.Resources, generateRosTemplateForResources());

  Object.assign(cloneTpl, generateRosTemplateForOutputs(bucketName, objectNames));
  Object.assign(cloneTpl, generateRosTemplateForRegionMap());

  return cloneTpl;
}

async function pack(tplPath, bucket, outputTemplateFile) {

  const tpl = await getTpl(tplPath);
  validateNasAndVpcConfig(tpl.Resources);

  const baseDir = path.dirname(tplPath);
  const ossClient = await getOssClient(bucket);

  const updatedTpl = await uploadAndUpdateFunctionCode(baseDir, tpl, ossClient);
  let updatedFlowTpl = await transformFlowDefinition(baseDir, updatedTpl);

  const serviceNasMapping = await nas.convertTplToServiceNasMappings(detectNasBaseDir(tplPath), updatedFlowTpl);
  const mergedNasMapping = await nasSupport.mergeNasMappingsInNasYml(getNasYmlPath(tplPath), serviceNasMapping);
  updatedFlowTpl = await processNasAutoToRosTemplate(ossClient, updatedFlowTpl, baseDir, bucket, mergedNasMapping);

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