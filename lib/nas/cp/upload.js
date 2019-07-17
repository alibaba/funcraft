'use strict';

const path = require('path');



const fs = require('fs');

const request = require('request');
const md5File = require('md5-file');
const floor = require('math-floor');
const rimraf = require('rimraf');  
const mkdirSync = require('mkdirp-sync'); 
const splitFileStream = require('split-file-stream');

const chunkSize = 90 * 1024;

let hasUploaded = 0;
let chunks = 0;

async function splitFile(srcPath, maxFileSize, outputPath) {
  return new Promise((resolve, reject) => {
    var readStream = fs.createReadStream(srcPath);
    splitFileStream.split(readStream, maxFileSize, outputPath, (filePaths) => {
      resolve(filePaths);
    });
  });
}


async function checkFileMD5(dstPath, fileMD5Value, fc_url, filename, isDir, srcPathLastChar) {
  return new Promise((resolve, reject) => {
    var options = {
      headers: { 'Connection': 'close' },
      url: `${fc_url}check/file?fileMD5=${fileMD5Value}&filename=${filename}&dstPath=${dstPath}&isDir=${isDir}&srcPathLastChar=${srcPathLastChar}`,
      method: 'GET'
    };
    
    function callback(error, response, data) {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    }
    
    request(options, callback);
  });
}

async function merge(fc_url) {
  return new Promise((resolve, reject) => {
    var options = {
      headers: {'Connection': 'close'},
      url: `${fc_url}merge?chunks=${chunks}`,
      method: 'GET'
    };
    
    function callback(error, response, data) {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    }
    request(options, callback);
  });
}

async function upload(srcPath, dstPath, fc_url, isDir) {
  let srcFilePath;
  
  let srcPathLastChar;
  if (isDir) {
    srcFilePath = await require('./pathResolver').tarDir(srcPath);
    
    srcPathLastChar = srcPath.charAt(srcPath.length - 1);
  } else {
    srcFilePath = srcPath;
    
  }
  
  md5File(srcFilePath, async function (err, fileMD5Value) {
    if (err) {
      console.log('Generate md5 err: ' + err);
      return;
    }
    console.log(fileMD5Value);
    let filename = path.basename(srcFilePath);
    let dirname = path.dirname(srcFilePath);

    
    let checkRes = await checkFileMD5(dstPath, fileMD5Value, fc_url, filename, isDir, srcPathLastChar);
    var checkResObj = JSON.parse(checkRes);
    if (checkResObj.stat === 1 && checkResObj.file.isExist && checkResObj.file.content) {
      console.log(srcFilePath + ' already exist!');
      return;
    }
    if (checkResObj.stat === -1 && checkResObj.isdir === 0) {
      console.log('directory ' + dstPath +' dosen\'t exist');
      return;
    }
    if (checkResObj.stat === -1 && checkResObj.isdir === 1) {
      console.log(dstPath + ' is not a directory');
      return;
    }

    var splitDir = path.join(dirname, `.${fileMD5Value}`);
    
    
    if (!fs.existsSync(splitDir) || (fs.existsSync(splitDir) && fs.statSync(splitDir).isFile())) {
      mkdirSync(splitDir, function (err) {
        if (err) { console.error(err) ; }
      });
    }
    var splitFiles = path.join(splitDir, `${fileMD5Value}`);

    await splitFile(srcFilePath, chunkSize, splitFiles);

    var splitFilesName = fs.readdirSync(splitDir);

    let uploadFlag = await chunkUpload(checkResObj.chunkList, splitFilesName, fc_url, splitDir);
    
    rimraf.sync(splitDir);
    
    if (isDir) {
      fs.unlink(srcFilePath, (err) => {
        if (err) { console.log(err); }
      });
    }
    
    
    if (uploadFlag) {
      let mergeRes = await merge(fc_url);
      let mergeResObj = JSON.parse(mergeRes);
      console.log(mergeResObj.info);
    } else {
      console.log('upload fail');
    }
    
  });
}

async function chunkUpload(chunkList, splitFiles, fc_url, splitDir) {
  chunks = splitFiles.length;
  hasUploaded = (chunkList === undefined) ? 0 : chunkList.length;
  
  let seq = 0;
  
  for (let value of splitFiles) {
    let splitExist = chunkList.indexOf(value) > -1;
    if (!splitExist) {
      let splitFilePath = path.join(splitDir, value);
      
      let uploadFileRes = await uploadFile(splitFilePath, seq, fc_url);
      var uploadFileResObj = JSON.parse(uploadFileRes);
      if (uploadFileResObj.stat === 0) {
        console.log(`upload fail.HTTP response : ${uploadFileResObj}`);
        return false;
      }
      hasUploaded++;
      seq++;
      let radio = floor((hasUploaded / chunks) * 100);
      console.log(`${radio}% has uploaded`);
    }
  }
  
  return true;
}

function uploadFile(splitFilePath, seq, fc_url) {
  return new Promise((resolve, reject) => {
    var options = {
      headers: { 'Connection': 'close' },
      url: `${fc_url}upload?chunks=${chunks}&chunkSeq=${seq}`,
      method: 'POST',
      formData: {
        title: 'upload splitFile',
        description: 'upload ' + new Date(),
        is_public: 1,
        sqlfiles: fs.createReadStream(splitFilePath)
      }
    };
    
    function callback(error, response, data) {
      if (error) {
        reject(error);   
      } else {
        resolve(data);
      }
    }
    
    request(options, callback);
  });
}

module.exports = { upload };