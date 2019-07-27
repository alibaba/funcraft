'use strict';
const { isDirJudge } = require('./file-support');
const path = require('path');
const fs = require('fs');
const PromisePool = require('es6-promise-pool');
const fileNameAndHash = require('./file-support').fileNameAndHash;
function getDirNameFromTarFile(fileName) {
  let dirName = fileName.substr(1);
  dirName = dirName.substr(0, dirName.length - 4);
  return dirName;
}

function parseDstPath(isDir, nasDstPath, fileName, isEndWithSlash) {
  return new Promise((resolve) => {
    isDirJudge(nasDstPath).then((isNasDir) => {
      if (isNasDir) {
        if (isDir) {
          if (isEndWithSlash) {
            resolve({
              dstDir: path.dirname(nasDstPath),
              dstName: path.basename(nasDstPath)
            });
          } else {
            resolve({
              dstDir: nasDstPath,
              dstName: getDirNameFromTarFile(fileName)
            });
          }
        } else {
          resolve({
            dstDir: nasDstPath,
            dstName: fileName
          });
        }
      } else {
        if (isDir) {
          throw new Error('cp folder to file error');
        } else {
          resolve({
            dstDir: path.dirname(nasDstPath),
            dstName: path.basename(nasDstPath)
          });
        }
      }
      
    }, (err) => {
      console.error(err);
    });
  });
}
function filesNameAndHash(tmpDir) {
  return new Promise((resolve, reject) => {
    fs.readdir(tmpDir, function (err, files) {
      if (err) {
        reject(err);
      } else {
        
        const splitFileNum = files.length;
        let cnt = 0;
        var promiseProducer = function () {
          if (cnt < splitFileNum) {
            const splitFile = path.join(tmpDir, files[cnt]);
            cnt++;
            return fileNameAndHash(splitFile);
          }
          return null;
        };
        let splitFilesMapHash = new Map();
        var pool = new PromisePool(promiseProducer, 10);
        pool.addEventListener('fulfilled', function (event) {
          splitFilesMapHash.set(event.data.result.fileName, event.data.result.fileHash);
        });
        pool.addEventListener('rejected', function (event) {
          reject(event.data.error);
        });
        pool.start()
          .then(() => {
            resolve(splitFilesMapHash);
          })
          .catch((err) => {
            reject(err);
          });
      }
    });
  });
}
function readTmpDir(tmpDir) {
  return new Promise((resolve, reject) => {
    fs.readdir(tmpDir, (err, files) => {
      if (err) {
        reject(err);
      } else {
        let filePaths = [];
        Promise.all(files.map(function (value) {
          let filePath = path.join(tmpDir, value);
          filePaths.push(filePath);
        })).then(() => {
          resolve(filePaths);
        });
      }
    });
  });
}

function getMergeFileDst(dstDir, dstName, fileName, isDir) {
  let res;
  if (isDir) {
    res = path.join(dstDir, dstName, fileName);
  } else {
    res = path.join(dstDir, dstName);
  }
  return res;
}
module.exports = { parseDstPath, filesNameAndHash, readTmpDir, getMergeFileDst };