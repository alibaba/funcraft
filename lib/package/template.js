'use strict';

const fc = require('../fc');
const fnf = require('../fnf');
const fs = require('fs-extra');
const path = require('path');
const util = require('./util');
const zip = require('../package/zip');
const definition = require('../definition');

const { red } = require('colors');
const { generateRandomZipPath } = require('../utils/path');

const _ = require('lodash');

const {
  parseYamlWithCustomTag
} = require('../parse');

function isOssUrl(url) {
  if (_.isEmpty(url)) { return false; }
  return url.startsWith('oss://');
}

async function checkZipCodeExist(client, objectName) {
  try {
    await client.head(objectName);
    return true;
  } catch (e) {
    if (e.name === 'NoSuchKeyError') {
      return false;
    }

    throw e;
  }
}

async function zipToOss(ossClient, srcPath, ignore) {
  const { randomDir, zipPath} = await generateRandomZipPath('nas.zip');

  await zip.packTo(srcPath, ignore, zipPath);

  const objectName = await util.md5(zipPath);
  const exist = await checkZipCodeExist(ossClient, objectName);

  if (!exist) {
    await ossClient.put(objectName, fs.createReadStream(zipPath));
  }

  await fs.remove(randomDir);
  return objectName;
}

async function uploadLocalNasDir(ossClient, baseDir, serviceNasMapping) {

  for (const serviceName in serviceNasMapping) {

    if (_.isEmpty(serviceNasMapping[serviceName])) {
      continue;
    }

    for (const { localNasDir } of serviceNasMapping[serviceName]) {
      const srcPath = path.resolve(baseDir, localNasDir);

      if (!await fs.pathExists(srcPath)) {
        console.warn(red(`\nwarning: ${srcPath} is not exist, skiping.`));
        continue;
      }

      await zipToOss(ossClient, srcPath, null);
    }
  }
}

async function uploadAndUpdateFunctionCode(baseDir, tpl, ossClient) {
  const updatedTplContent = _.cloneDeep(tpl);
  const functionsNeedUpload = [];

  definition.iterateFunctions(updatedTplContent, (serviceName, serviceRes, functionName, functionRes) => {
    const codeUri = (functionRes.Properties || {}).CodeUri;

    if (isOssUrl(codeUri)) {
      return;
    }

    functionsNeedUpload.push({
      functionRes
    });
  });

  const codeUriCache = new Map();

  for (const { functionRes } of functionsNeedUpload) {
    const codeUri = (functionRes.Properties || {}).CodeUri;
    const absCodeUri = path.resolve(baseDir, codeUri);

    if (!await fs.pathExists(absCodeUri)) {
      throw new Error(`codeUri ${absCodeUri} is not exist`);
    }

    if (codeUriCache.get(absCodeUri)) {
      functionRes.Properties.CodeUri = codeUriCache.get(absCodeUri);
      continue;
    }

    const ignore = await fc.generateFunIngore(baseDir, codeUri);
    const objectName = await zipToOss(ossClient, absCodeUri, ignore);

    const resolveCodeUri = `oss://${ossClient.options.bucket}/${objectName}`;
    functionRes.Properties.CodeUri = resolveCodeUri;

    codeUriCache.set(absCodeUri, resolveCodeUri);
  }
  return updatedTplContent;
}

async function transformFlowDefinition(baseDir, tpl) {
  const updatedTplContent = _.cloneDeep(tpl);
  const flowsNeedTransform = [];

  definition.iterateResources(
    updatedTplContent.Resources,
    definition.FLOW_RESOURCE,
    (flowName, flowRes) => {
      const { Properties: flowProperties = {} } = flowRes;
      if (!flowProperties.DefinitionUri && !flowProperties.Definition) {
        throw new Error(`${flowName} should have DefinitionUri or Definition`);
      }
      if (!flowProperties.Definition) {
        flowsNeedTransform.push(flowRes);
      }
    }
  );
  const definitionCache = new Map();
  for (const flowRes of flowsNeedTransform) {
    const { Properties: flowProperties } = flowRes;
    const definitionUri = flowProperties.DefinitionUri;
    const absDefinitionUri = path.resolve(baseDir, definitionUri);
    if (!await fs.pathExists(absDefinitionUri)) {
      throw new Error(`DefinitionUri ${absDefinitionUri} is not exist`);
    }

    if (definitionCache.get(absDefinitionUri)) {
      flowProperties.Definition = definitionCache.get(absDefinitionUri);
      continue;
    }

    const definitionObj = parseYamlWithCustomTag(
      absDefinitionUri,
      fs.readFileSync(absDefinitionUri, 'utf8')
    );
    const definition = fnf.transformFunctionInDefinition(
      definitionObj,
      tpl,
      {},
      true
    );
    delete flowProperties.DefinitionUri;
    flowProperties.Definition = {
      'Fn::Sub': definition
    };
    definitionCache.set(absDefinitionUri, definition);
  }

  return updatedTplContent;
}

module.exports = {
  uploadLocalNasDir,
  transformFlowDefinition,
  uploadAndUpdateFunctionCode

};