'use strict';

const { getFcClient } = require('../client');
const fs = require('fs-extra');
const path = require('path');
const { getFileHash } = require('./cp/file');
const { yellow } = require('colors');
const constants = require('./constants');
const PROXY = 'proxy';

function getNasHttpTriggerPath(serviceName) {
  const nasServiceName = constants.FUN_NAS_SERVICE_PREFIX + serviceName;

  return `/${PROXY}/${nasServiceName}/${constants.FUN_NAS_FUNCTION}/`;
}

async function getRequest(path, query, headers) {
  
  const rs = await request('GET', path, query, headers);
  return rs;
}

async function postRequest(path, query, body, headers, opts) {
  const res = await request('POST', path, query, body, headers, opts);
  return res;
}

async function request(method, path, query, body, headers, opts) {
  let fcClient = await getFcClient({
    timeout: constants.FUN_NAS_TIMEOUT
  });

  let res;

  try {
    headers = Object.assign(headers || {}, {
      'X-Fc-Log-Type': 'Tail'
    });
    
    res = await fcClient.request(method, path, query, body, headers, opts || {});
    
    const data = (res && res.data) || {};
    

    if (data.error) {
      
      throw new Error(data.error);
    } else { return res; }    
  } catch (e) {
    
    const headers = (res || {}).headers || {};
    const log = headers['x-fc-log-result'];

    if (log) {
      console.log(yellow('========= FC NAS Server Logs begin ========='));
      const decodedLog = Buffer.from(log, 'base64');
      console.log(decodedLog.toString());
      console.log(yellow('========= FC NAS Server Logs end ========='));
    }
     
    throw e;
  }
}

async function statsRequest(dstPath, nasHttpTriggerPath) {
  const urlPath = nasHttpTriggerPath + 'stats';
  const query = { dstPath };
  return await getRequest(urlPath, query);
}

async function sendCmdRequest(nasHttpTriggerPath, cmd) {
  const urlPath = nasHttpTriggerPath + 'commands';

  const query = {};
  const body = { cmd };
 
  return await postRequest(urlPath, query, body);
}

async function checkFileHash(dstPath, nasHttpTriggerPath, fileHashValue, fileName, isNasFile) {

  const urlPath = nasHttpTriggerPath + 'check/file';
  isNasFile = isNasFile ? 'true' : 'false';
  const query = {
    fileHashValue,
    fileName,
    dstPath,
    isNasFile
  };

  return await getRequest(urlPath, query);
}

async function checkHasUpload(dstPath, nasHttpTriggerPath, fileHashValue, fileName) {
  const urlPath = nasHttpTriggerPath + 'nas/stats';

  const query = {
    fileHashValue,
    fileName,
    dstPath
  };

  return await getRequest(urlPath, query);
}

async function sendUnzipRequest(nasHttpTriggerPath, dstDir, nasZipFile, unzipFiles) {
  let cmd = `unzip -q -o ${nasZipFile} -d ${dstDir}`;
  for (let unzipFile of unzipFiles) {
    cmd = cmd + ` "${unzipFile}"`;
  }
  
  return await sendCmdRequest(nasHttpTriggerPath, cmd);
}

async function sendMergeRequest(nasHttpTriggerPath, nasTmpDir, dstDir, fileName, fileHashValue) {
  const urlPath = nasHttpTriggerPath + 'split/merge';
  
  const query = {
    nasTmpDir,
    dstDir,
    fileName,
    fileHashValue
  };
  
  return await postRequest(urlPath, query);
}

async function uploadSplitFile(nasHttpTriggerPath, nasTmpDir, filePath) {
  const fileName = path.basename(filePath);
  const urlPath = nasHttpTriggerPath + 'split/uploads';

  const fileHashValue = await getFileHash(filePath);

  const body = await fs.readFile(filePath);

  const query = {
    fileName,
    nasTmpDir,
    fileHashValue
  };

  const headers = {};

  const uploadFileRes = await postRequest(urlPath, query, body, headers);

  return uploadFileRes;
}

async function uploadFile(srcFilePath, dstDir, nasHttpTriggerPath, fileHashValue, fileName) {
  console.log('Uploading...');
  const urlPath = nasHttpTriggerPath + 'uploads';
  
  const query = {
    dstDir,
    fileHashValue,
    fileName
  };
  const headers = {};

  const body = await fs.readFile(srcFilePath);

  const uploadFileRes = await postRequest(urlPath, query, body, headers);

  return uploadFileRes;
}

async function sendCleanRequest(nasHttpTriggerPath, nasZipFile) {
  const urlPath = nasHttpTriggerPath + 'clean';
  const query = {
    nasZipFile
  };
  return await getRequest(urlPath, query);
}

module.exports = {
  statsRequest,
  checkHasUpload,
  checkFileHash,
  sendMergeRequest,
  uploadSplitFile,
  sendCmdRequest,
  uploadFile,
  getNasHttpTriggerPath,
  sendUnzipRequest, 
  sendCleanRequest
};