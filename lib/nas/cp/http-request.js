'use strict';
const { getRequest, postRequest } = require('./http-config');
const path = require('path');
const readFileAsBuf = require('./file-support').readFileAsBuf;
async function checkPath(dstPath, commonPath) {
  let p = commonPath + 'check/path';
  let q = { dstPath: dstPath };
  let checkPathRes = await getRequest(p, q);
  
  return checkPathRes;
}

async function checkHasUpload(dstPath, commonPath, fileHashValue, fileName, dirFlag, endWithSlashFlag) {
  let p = commonPath + 'check/is-uploaded';
  dirFlag = dirFlag.toString();
  endWithSlashFlag = endWithSlashFlag.toString();
  let q = { fileHashValue: fileHashValue, fileName: fileName, dstPath: dstPath, dirFlag: dirFlag, endWithSlashFlag: endWithSlashFlag };
  
  let checkHasUploadRes = await getRequest(p, q);
  return checkHasUploadRes;
}

async function checkFileHash(dstPath, commonPath, fileHashValue, fileName, nasFileFlag) {

  let p = commonPath + 'check/file';
  nasFileFlag = nasFileFlag ? '1' : '0';
  let q = { 
    fileHashValue: fileHashValue, 
    fileName: fileName, 
    dstPath: dstPath, 
    nasFileFlag: nasFileFlag 
  };

  let checkFileHashRes = await getRequest(p, q);
  return checkFileHashRes;
}

async function merge(commonPath, nasTmpDir, dstDir, dstName, fileName, dirFlag, fileHashValue) {
  let p = commonPath + 'merge';
  dirFlag = dirFlag.toString();
  let q = { nasTmpDir: nasTmpDir, dstDir: dstDir, dstName: dstName, fileName: fileName, dirFlag: dirFlag, fileHashValue: fileHashValue };
  let mergeRes = await getRequest(p, q);
  return mergeRes;
}

async function uploadFile(commonPath, nasTmpDir, fileHashValue, filePath) {
  return new Promise(async function (resolve, reject) {
    let fileName = path.basename(filePath);
    let p = commonPath + 'upload';
    let q = { 
      fileName: fileName, 
      nasTmpDir: nasTmpDir, 
      fileHashValue: fileHashValue
    };
    let headers = {};
    
    readFileAsBuf(filePath).then( async function (body) {
      try {
        let uploadFileRes = await postRequest(p, body, headers, q);
        resolve(uploadFileRes);
      } catch (error) {
        console.log('upload file err : ' + error);
        reject(error);
      }
    });
  });
}
async function sendCmdReq(commonPath, cmd) {
  return new Promise(async function(resolve, reject) {
    let p = commonPath + 'exe';
    var q = { cmd: cmd };
    try {
      
      let res = await getRequest(p, q);
      resolve(res);
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { checkPath, checkHasUpload, checkFileHash, merge, uploadFile, sendCmdReq };