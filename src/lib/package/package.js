'use strict';

const fs = require('fs-extra');
const nas = require('../nas');
const path = require('path');
const util = require('../import/utils');
const uuid = require('uuid');
const debug = require('debug')('fun:package');
const nasSupport = require('../nas/support');

const _ = require('lodash');

const { getProfile } = require('../profile');
const { isEmptyDir } = require('../nas/cp/file');
const { getOssClient } = require('../client');
const { green } = require('colors');
const { showPackageNextTips } = require('../build/tips');
const { ensureFilesModified } = require('../utils/file');
const { parseMountDirPrefix } = require('../fc');
const { transformRosYmlCodeUri } = require('./template');
const { getTpl, detectNasBaseDir, getNasYmlPath } = require('../tpl');
const { getFunctionImage } = require('./pushImage');
const { processOSSBucket } = require('../oss');
const { validateNasAndVpcConfig, SERVICE_RESOURCE, iterateResources, isNasAutoConfig, isVpcAutoConfig, getUserIdAndGroupId } = require('../definition');

const {
  zipToOss,
  uploadNasService,
  processNasPythonPaths,
  transformFlowDefinition,
  generateServiceLogConfig,
  generateRosTemplateForSLS,
  uploadAndUpdateFunctionCode,
  generateRosTemplateForRegionMap,
  generateRosTemplateForVpcConfig,
  generateRosTemplateForNasConfig,
  generateRosTemplateForNasService,
  generateRosTemplateForEventOutputs,
  generateRosTemplateForNasCpInvoker,
  generateRosTemplateForWaitCondition,
  generateRosTemplateForDefaultOutputs,
  generateRosTemplateForDefaultResources
} = require('./template');
const utils = require('../import/utils');

async function processNasAutoToRosTemplate({ tpl, baseDir, tplPath,
  ossClient,
  bucketName
}) {
  const cloneTpl = _.cloneDeep(tpl);

  const servicesNeedUpdate = [];
  iterateResources(cloneTpl.Resources, SERVICE_RESOURCE, (serviceName, serviceRes) => {
    const nasConfig = (serviceRes.Properties || {}).NasConfig;
    const vpcConfig = (serviceRes.Properties || {}).VpcConfig;

    const nasAuto = isNasAutoConfig(nasConfig);
    const vpcAuto = isVpcAutoConfig(vpcConfig);

    if (nasAuto && !_.isEmpty(vpcConfig) && !vpcAuto) {
      throw new Error(`When 'NasConfig: Auto' is specified, 'VpcConfig' is not supported.`);
    }
    if (nasAuto && (vpcAuto || _.isEmpty(vpcConfig))) {
      servicesNeedUpdate.push({
        serviceName,
        serviceRes
      });
    }
  });

  if (_.isEmpty(servicesNeedUpdate)) { return cloneTpl; }

  const serviceNasMapping = await nas.convertTplToServiceNasMappings(detectNasBaseDir(tplPath), tpl);
  const mergedNasMapping = await nasSupport.mergeNasMappingsInNasYml(getNasYmlPath(tplPath), serviceNasMapping);

  let count = 0;
  let totalObjectNames = [];
  for (const { serviceName, serviceRes } of servicesNeedUpdate) {
    const serviceProp = (serviceRes.Properties || {});
    const nasConfig = serviceProp.NasConfig;

    const { userId, groupId } = getUserIdAndGroupId(nasConfig);

    serviceProp.VpcConfig = generateRosTemplateForVpcConfig();
    serviceProp.NasConfig = generateRosTemplateForNasConfig(serviceName, userId, groupId);

    const objectNames = [];
    for (const { localNasDir, remoteNasDir } of mergedNasMapping[serviceName]) {
      const srcPath = path.resolve(baseDir, localNasDir);

      if (!await fs.pathExists(srcPath)) {
        console.warn(`\n${srcPath} is not exist, skiping.`);
        continue;
      }
      if (isEmptyDir(srcPath)) {
        console.warn(`\n${srcPath} is empty directory, skiping.`);
        continue;
      }
      const prefix = path.relative(parseMountDirPrefix(nasConfig), remoteNasDir);
      const objectName = await zipToOss(ossClient, srcPath, null, 'nas.zip', prefix, tplPath, { level: 1 });

      if (!objectName) {
        console.warn(`\n${srcPath} is empty directory, skiping.`);
        continue;
      }
      objectNames.push(objectName);
      totalObjectNames.push(objectName);
    }

    if (_.isEmpty(objectNames)) {
      debug(`warning: There is no local NAS directory available under service: ${serviceName}.`);
      continue;
    }

    const customizer = (objValue, srcValue) => {
      return _.isEmpty(objValue) ? srcValue : _.merge(objValue, srcValue);
    };

    _.assignWith(cloneTpl, generateRosTemplateForEventOutputs(bucketName, objectNames, serviceName), customizer);

    Object.assign(cloneTpl.Resources, generateRosTemplateForNasCpInvoker(serviceName, bucketName, objectNames));

    count ++;
  }

  Object.assign(cloneTpl, generateRosTemplateForRegionMap());

  const needUpdateServiceNames = servicesNeedUpdate.map(s => s.serviceName);
  Object.assign(cloneTpl.Resources, generateRosTemplateForDefaultResources(needUpdateServiceNames, totalObjectNames.length > 0));

  if (_.isEmpty(totalObjectNames)) { return cloneTpl; }

  const codeUri = await uploadNasService(ossClient, tplPath);

  Object.assign(cloneTpl.Resources, generateRosTemplateForNasService(codeUri));
  Object.assign(cloneTpl.Resources, generateRosTemplateForWaitCondition(count));

  return _.merge(cloneTpl, generateRosTemplateForDefaultOutputs());
}

function generateRosTemplateForPathConfig(serviceName, functionName) {
  return {
    'ServiceName': {
      'Fn::GetAtt': [
        serviceName,
        'ServiceName'
      ]
    },
    'FunctionName': {
      'Fn::GetAtt': [
        serviceName + functionName,
        'FunctionName'
      ]
    }
  };
}
function needToTransForm(serviceName, functionName) {
  return (typeof serviceName === 'string' && typeof functionName === 'string');
}

function transformRoutesToRosTemplate(routes) {
  const transFormRoutes = Object.assign({}, routes);

  const result = {};
  for (const route of Object.entries(transFormRoutes)) {
    const serviceName = route[1].ServiceName || route[1].serviceName;
    const functionName = route[1].FunctionName || route[1].functionName;
    if (!needToTransForm(serviceName, functionName)) { result[route[0]] = route[1]; }
    else {
      result[route[0]] = generateRosTemplateForPathConfig(serviceName, functionName);
    }
  }

  return result;
}

function transformCustomDomain(tpl) {
  const cloneTpl = _.cloneDeep(tpl);

  const domainNeedUpdate = [];

  iterateResources(cloneTpl.Resources, 'Aliyun::Serverless::CustomDomain', (domainLogicId, domainDefinition) => {
    domainNeedUpdate.push({
      domainDefinition
    });
  });

  for (const { domainDefinition } of domainNeedUpdate) {
    const properties = (domainDefinition.Properties || {});
    const routeConfig = properties.RouteConfig || {};
    const routes = routeConfig.Routes || routeConfig.routes;

    if (_.isEmpty(routes)) { continue; }

    properties.RouteConfig.Routes = transformRoutesToRosTemplate(routes);
  }

  return cloneTpl;
}

async function transformSlsAuto(tpl) {
  const cloneTpl = _.cloneDeep(tpl);

  const servicesNeedUpdate = [];
  iterateResources(cloneTpl.Resources, SERVICE_RESOURCE, (serviceName, serviceRes) => {
    const logConfig = (serviceRes.Properties || {}).LogConfig;

    if (logConfig === 'Auto') {
      servicesNeedUpdate.push({
        serviceName,
        serviceRes
      });
    }
  });

  if (_.isEmpty(servicesNeedUpdate)) { return cloneTpl; }

  const projectName = `fc-${uuid.v1()}`;
  const logstoreName = 'function-log';

  for (const { serviceRes } of servicesNeedUpdate) {
    const serviceProp = (serviceRes.Properties || {});

    serviceProp.LogConfig = generateServiceLogConfig(projectName, logstoreName);
  }

  Object.assign(cloneTpl.Resources, generateRosTemplateForSLS(projectName, logstoreName));

  return cloneTpl;
}

async function pack(tplPath, bucket, outputTemplateFile, useNas, pushRegistry, assumeYes) {
  const tpl = await getTpl(tplPath);
  if (tpl.Transform) {
    validateNasAndVpcConfig(tpl.Resources);
  }

  const baseDir = path.dirname(tplPath);

  const bucketName = await processOSSBucket(bucket, assumeYes);

  await ensureFilesModified(tplPath);

  const ossClient = await getOssClient(bucketName);

  let packedYmlPath;

  if (outputTemplateFile) {
    packedYmlPath = path.resolve(process.cwd(), outputTemplateFile);
  } else {
    packedYmlPath = path.join(process.cwd(), 'template.packaged.yml');
  }

  if (!tpl.Transform) {
    await transformRosYmlCodeUri({ baseDir, tpl, tplPath, bucketName, ossClient });
    path.join(process.cwd(), 'template.packaged.yml');
    utils.outputTemplateFile(packedYmlPath, tpl);
    console.log(green('\nPackage success'));
    showPackageNextTips(packedYmlPath);
    return;
  }

  const updatedEnvTpl = await processNasPythonPaths(tpl, tplPath);
  if (pushRegistry) {
    const profile = await getProfile();
    await getFunctionImage({ tpl, region: profile.defaultRegion, pushRegistry });
  }
  const updatedCodeTpl = await uploadAndUpdateFunctionCode({ tpl: updatedEnvTpl, tplPath, baseDir, ossClient, useNas });
  const updatedSlsTpl = await transformSlsAuto(updatedCodeTpl);
  const updatedFlowTpl = await transformFlowDefinition(baseDir, transformCustomDomain(updatedSlsTpl));
  const updatedTpl = await processNasAutoToRosTemplate({ ossClient, baseDir, tplPath, tpl: updatedFlowTpl, bucketName });

  util.outputTemplateFile(packedYmlPath, updatedTpl);

  console.log(green('\nPackage success'));
  showPackageNextTips(packedYmlPath);
}

module.exports = {
  pack
};