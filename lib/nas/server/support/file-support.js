'use strict';

const fs = require('fs');
const md5File = require('md5-file');
const splitFile = require('split-file');
const path = require('path');
const mkdirp = require('mkdirp');

const unzip = require('unzipper');

function makeDir(dirPath) {
  mkdirp(dirPath, function (err) {
    if (err) {
      throw new Error(err);
    }
  });
}
function fileNameAndHash(filePath) {
  return new Promise((resolve, reject) => {
    let fileName = path.basename(filePath);
    getFileHash(filePath).then((fileHash) => {
      resolve({
        fileName,
        fileHash
      });
    })
      .catch((err) => {
        reject(err);
      });
  });
}
function isDirJudge(inputPath) {
  return new Promise((resolve, reject) => {
    fs.lstat(inputPath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(stats.isDirectory());
      }
    });
  });
}

function isFileJudge(inputPath) {
  return new Promise((resolve, reject) => {
    fs.lstat(inputPath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(stats.isFile());
      }
    });
  });
}



function getFileHash(filePath) {
  return new Promise((resolve, reject) => {
    isFileJudge(filePath).then((isFile) => {
      if (isFile) {
        md5File(filePath, (err, hash) => {
          if (err) {
            console.log(`${filePath} hash error : ${err}`);
            reject(err);
          } else {
            resolve(hash);
          }
        });
      } else {
        reject('Target is not a file');
      }
    }).catch((err) => {
      reject(err);
    });
  });
}

function mergeFiles(splitFilesArr, nasFile) {
  return new Promise((resolve, reject) => {
    splitFile.mergeFiles(splitFilesArr, nasFile)
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
  });
}


function isSameFile(dstPath, srcFilename, srcFileHash) {
  return new Promise((resolve, reject) => {
    if (srcFilename !== path.basename(dstPath)) {
      resolve(false);
    } else {
      fs.lstat(dstPath, (err, stats) => {
        if (err) {
          resolve(false);
        } else {
          if (!stats.isFile()) {
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
        }
      });
    }
  });
}
function unzipFile(zipFile, dstPath) {
  return new Promise((resolve, reject) => {

    fs.createReadStream(zipFile)
      .pipe(unzip.Extract({ path: dstPath }))
      .on('error', (err) => {
        console.log(`unzip ${zipFile} to ${dstPath} error : ${err}`);
        reject(err);
      })
      .on('finish', resolve(`unzip ${zipFile} to ${dstPath} done`));
  });
}

function writeBufToFile(dstPath, buf) {
  return new Promise((resolve, reject) => {
    const data = new Buffer(buf, 'base64');
    const ws = fs.createWriteStream(dstPath);
    ws.write(data);
    ws.end();
    ws.on('finish', () => {
      console.log(`${dstPath} wirte done`);
      resolve();
    });
    ws.on('error', (error) => {
      console.log(`${dstPath} write error : ${error}`);
      reject(error);
    });
  });
}

module.exports = { 
  isDirJudge, 
  isFileJudge, 
  getFileHash, 
  makeDir, 
  isSameFile, 
  mergeFiles, 
  unzipFile, 
  writeBufToFile, 
  fileNameAndHash 
};