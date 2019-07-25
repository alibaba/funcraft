'use strict';

const fs = require('fs');
const md5File = require('md5-file');
const tar = require('tar-fs');
const splitFileStream = require('split-file-stream');
const path = require('path');
const mkdirp = require('mkdirp');
const compressing = require('compressing');

function makeDir(dirPath) {
  mkdirp(dirPath, function (err) {
    if (err) {
      throw new Error(err);
    }
  });
}

function isDir(inputPath) {
  return new Promise((resolve, reject) => {
    isExist(inputPath).then((flag) => {
      if (flag) {
        fs.stat(inputPath, (err, stat) => {
          if (err) {
            console.error(err);
          } else if (stat.isDirectory()) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
      } else {
        reject('Path dose not exist');
      }
    }).catch(function (err) {
      console.error(err);
    });
  });
}

function isFile(inputPath) {
  return new Promise((resolve, reject) => {
    isExist(inputPath).then((flag) => {
      if (flag) {
        fs.stat(inputPath, (err, stat) => {
          if (err) {
            console.error(err);
          } else if (stat.isFile()) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
      } else {
        reject('Path dose not exist');
      }
    }).catch(function (err) {
      console.error(err);
    });
  });
}

function isExist(inputPath) {
  return new Promise((resolve, reject) => {
    if (inputPath) {
      fs.exists(inputPath, (flag) => {
        resolve(flag);
      });
    } else {
      reject('PATH EMPTY ERROR');
    }
  });
}

function getFileHash(filePath) {
  return new Promise((resolve, reject) => {
    isFile(filePath).then((flag) => {
      if (flag) {
        md5File(filePath, (err, hash) => {
          if (err) {
            reject(err);
          } else {
            resolve(hash);
            
          }
        });
      } else {
        reject('Target is not a file');
      }
    }).catch(function (err) {
      console.error(err);
    });
  });
}

function mergeAndUntarFile(splitFilesArr, dstPath, dirFlag) {
  return new Promise((resolve) => {
    splitFileStream.mergeFilesToStream(splitFilesArr, (outStream) => {
      let extract = tar.extract(dstPath);
      outStream.pipe(extract);
      extract.on('finish', function () {
        resolve('extract finish');
      });
      
      outStream.on('end', () => {
        console.log('Out stream closed. All files have been merged');
      });
    });
  });
}

function mergeFiles(splitFilesArr, nasFile) {
  return new Promise((resolve, reject) => {
    splitFileStream.mergeFilesToDisk(splitFilesArr, nasFile, function(err) {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}


function sameFileJudgement(dstPath, srcFilename, srcFileHash) {
  return new Promise((resolve, reject) => {
    if (srcFilename !== path.basename(dstPath)) {
      resolve(false);
    } else {
      isExist(dstPath).then((flag) => {
        if (!flag) {
          resolve(false);
        } else {
          isFile(dstPath).then((fileFlag) => {
            if (!fileFlag) {
              resolve(false);
            } else {
              getFileHash(dstPath).then((dstFileHash) => {
                if (dstFileHash === srcFileHash) {
                  resolve(true);
                } else {
                  resolve(false);
                }
              }, (err) => {
                reject(err);
              });
            }
          })
        }
      });
    }
  });
}
function unzipFile(zipFile, dstPath) {
  return new Promise((resolve, reject) => {
    compressing.zip.uncompress(zipFile, dstPath)
      .then(() => {
        resolve(zipFile + 'unzip to ' + dstPath);
      })
      .catch(err => {
        reject(err);
      });
  });
}
function writeBufToFile(dstPath, buf) {
  return new Promise((resolve, reject) => {
    let data = new Buffer(buf, 'base64');
    fs.writeFile(dstPath, data, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

module.exports = { isDir, isFile, isExist, getFileHash, mergeAndUntarFile, makeDir, sameFileJudgement, mergeFiles, unzipFile, writeBufToFile };