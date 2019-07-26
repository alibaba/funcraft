'use strict';
const { isDir } = require('./file-support');
const path = require('path');
const fs = require('fs');
const getFileHash = require('./file-support').getFileHash;
function getDirNameFromTarFile(fileName) {
  let dirName = fileName.substr(1);
  dirName = dirName.substr(0, dirName.length - 4);
  return dirName;
}


function parseDstPath(isDirFlag, nasDstPath, fileName, endWithSlashFlag) {
  return new Promise((resolve) => {
    isDir(nasDstPath).then((flag) => {
      if (flag) {
        if (isDirFlag === 1) {
          if (endWithSlashFlag === 1) {
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
        if (isDirFlag === 1) {
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
function readTmpFilePathAndHash(tmpDir, hashValue) {
  return new Promise((resolve, reject) => {
    fs.readdir(tmpDir, function (err, files) {
      if (err) {
        reject(err);
      } else {
        let splitFilesMapHash = new Map();
        Promise.all(files.map(function (value) {
          if (value.includes(hashValue)) {
            let splitFile = path.join(tmpDir, value);
            getFileHash(splitFile).then((splitFileHashValue) => {
              splitFilesMapHash.set(value, splitFileHashValue);
            }, (err) => {
              reject(err);
            });
          }
        })).then(() => {
          resolve(splitFilesMapHash);
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

function getMergeFileDst(dstDir, dstName, fileName, isDirFlag) {
  let res;
  if (isDirFlag === 1) {
    res = path.join(dstDir, dstName, fileName);
  } else {
    res = path.join(dstDir, dstName);
  }
  return res;
}
module.exports = { parseDstPath, readTmpFilePathAndHash, readTmpDir, getMergeFileDst };