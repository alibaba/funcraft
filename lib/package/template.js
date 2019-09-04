'use strict';

const zip = require('../package/zip');
const uuid = require('uuid');
const tempDir = require('temp-dir');
const fc = require('../fc');
const definition = require('../definition');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const util = require('./util');

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

async function uploadAndUpdateFunctionCode(baseDir, tpl, ossClient) {
  const updatedTplContent = _.cloneDeep(tpl);
  const functionsNeedUpload = [];

  definition.iterateFunctions(updatedTplContent, (serviceName, serviceRes, functionName, functionRes) => {
    const codeUri = (functionRes.Properties || {}).CodeUri;

    if (isOssUrl(codeUri)) {
      return;
    }

    functionsNeedUpload.push({
      serviceName,
      functionName,
      functionRes
    });
  });
  
  for (const { serviceName, functionName, functionRes } of functionsNeedUpload) {
    const codeUri = (functionRes.Properties || {}).CodeUri;
    
    const absCodeUri = path.resolve(baseDir, codeUri);
    if (!await fs.pathExists(absCodeUri)) {
      throw new Error(`codeUri ${absCodeUri} is not exist`);
    }

    const randomDirName = uuid.v4();
    const randomDir = path.join(tempDir, randomDirName);
    
    await fs.ensureDir(randomDir);
    const zipPath = path.join(randomDir, 'code.zip');
  
    const ignore = fc.generateFunIngore(baseDir, codeUri);

    await zip.packTo(absCodeUri, ignore, zipPath);
    
    const md5 = await util.md5(zipPath);
    const objectName = `${serviceName}/${functionName}/${md5}`;
    const exist = await checkZipCodeExist(ossClient, objectName);

    if (!exist) {
      await ossClient.put(objectName, fs.createReadStream(zipPath));
    }

    await fs.remove(randomDir);
    
    functionRes.Properties.CodeUri = `oss://${ossClient.options.bucket}/${objectName}`;
  }

  return updatedTplContent;
}

module.exports = {
  uploadAndUpdateFunctionCode
};