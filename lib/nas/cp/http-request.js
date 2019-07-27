'use strict';
const { getRequest, postRequest } = require('./http-config');
const path = require('path');
const readFileAsBuf = require('./file-support').readFileAsBuf;
const getFileHash = require('./file-support').getFileHash;

async function checkPath(dstPath, commonPath) {
  const urlPath = commonPath + 'check/path';
  const query = { dstPath };
  return await getRequest(urlPath, query);
}

async function checkHasUpload(dstPath, commonPath, fileHashValue, fileName, isDir, isEndWithSlash) {
  const urlPath = commonPath + 'check/is-uploaded';
  isDir = isDir ? 'true' : 'false';
  isEndWithSlash = isEndWithSlash ? 'true' : 'false';
  const query = { 
    fileHashValue, 
    fileName, 
    dstPath, 
    isDir, 
    isEndWithSlash 
  };
  
  return await getRequest(urlPath, query);
  
}

async function checkFileHash(dstPath, commonPath, fileHashValue, fileName, isNasFile) {

  const urlPath = commonPath + 'check/file';
  isNasFile = isNasFile ? 'true' : 'false';
  const query = { 
    fileHashValue, 
    fileName, 
    dstPath, 
    isNasFile 
  };

  return await getRequest(urlPath, query);
}

async function merge(commonPath, nasTmpDir, dstDir, dstName, fileName, isDir, fileHashValue) {
  const urlPath = commonPath + 'merge';
  isDir = isDir ? 'true' : 'false';
  const query = {
    nasTmpDir, 
    dstDir, 
    dstName, 
    fileName, 
    isDir, 
    fileHashValue
  };
  return await getRequest(urlPath, query);
}

async function uploadSplitFile(commonPath, nasTmpDir, filePath) {
  return new Promise(async function (resolve, reject) {
    const fileName = path.basename(filePath);
    const urlPath = commonPath + 'upload/split-file';
    getFileHash(filePath).then((fileHashValue) => {
      const query = { 
        fileName, 
        nasTmpDir, 
        fileHashValue
      };
      const headers = {};
      readFileAsBuf(filePath).then(async (body) => {
        try {
          const uploadFileRes = await postRequest(urlPath, body, headers, query);
          resolve(uploadFileRes);
        } catch (error) {
          console.log('upload file err : ' + error);
          reject(error);
        }
      });
    })
      .catch((err) => {
        console.log('upload file err : ' + err);
        reject(err);
      });
  });
}
async function sendCmdReq(commonPath, cmd) {
  return new Promise(async function(resolve, reject) {
    const urlPath = commonPath + 'exe';
    const query = { cmd };
    try {
      
      const res = await getRequest(urlPath, query);
      resolve(res);
    } catch (error) {
      reject(error);
    }
  });
}

function uploadFile(srcFilePath, dstDir, commonPath, fileHashValue, dstName, isDir, fileName) {
  return new Promise((resolve, reject) => {
    console.log('===== single file upload');
    const urlPath = commonPath + 'upload/file';
    isDir = isDir ? 'true' : 'false';
    const query = {
      dstDir, 
      fileHashValue, 
      dstName, 
      isDir, 
      fileName
    };
    const headers = {};
    readFileAsBuf(srcFilePath).then(async (body) => {
      try {
        const uploadFileRes = await postRequest(urlPath, body, headers, query);
        resolve(uploadFileRes);
      } catch (error) {
        reject(error);
      }
    });
  });
}

module.exports = { 
  checkPath, 
  checkHasUpload, 
  checkFileHash, 
  merge, 
  uploadSplitFile, 
  sendCmdReq, 
  uploadFile 
};