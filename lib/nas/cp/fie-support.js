'use strict';

const fs = require('fs');
const md5File = require('md5-file');
const path = require('path');
const splitFileStream = require('split-file-stream');
const archiver = require('archiver');

function tarFunc(inputPath) {
  return new Promise((resolve, reject) => {
    isExist(inputPath).then((flag) => {
      if (flag) {
        let targetName = path.basename(inputPath);
        let parentDir = path.dirname(inputPath);

        let zipDst = path.join(parentDir, `.${targetName}.zip`);
        
        var output = fs.createWriteStream(zipDst);
        var archive = archiver('zip', {
          zlib: { level: 9 } // Sets the compression level.
        });
        output.on('close', function() {
          //console.log(archive.pointer() + ' total bytes');
          
          resolve(zipDst);
        });
        
        archive.on('warning', function(err) {
          if (err.code === 'ENOENT') {
            resolve(zipDst);
            //debug(err);
          } else {
            reject(err);
          }
        });
        archive.on('error', function(err) {
          reject(err);
        });
        archive.pipe(output);
        archive.directory(inputPath, false);
        archive.finalize();
      } else {
        reject('tar path not exist');
      }
    }, (err) => {
      reject(err);
    });
  });
}

function isDir(inputPath) {
  return new Promise((resolve, reject) => {
    let promise = isExist(inputPath);
    promise.then((flag) => {
      if (flag) {
        fs.stat(inputPath, (err, stat) => {
          if (err) {
            reject(err);
          } else {
            if (stat.isDirectory()) {
              resolve(true);
            }
            resolve(false);
          }
        });
      } else {
        reject('Path dose not exist');
      }
    }, (error) => {
      reject(error);
    });
  });
}

function isFile(inputPath) {
  return new Promise((resolve, reject) => {
    let promise = isExist(inputPath);
    promise.then((flag) => {
      if (flag) {
        fs.stat(inputPath, (err, stat) => {
          if (err) {
            reject(err);
          } else {
            if (stat.isFile()) {
              resolve(true);
            }
            resolve(false);
          }

        });
      } else {
        reject('File dose not exist');
      }
    }, (error) => {
      reject(error);
    });
  });
}

function isExist(inputPath) {
  return new Promise((resolve, reject) => {
    if (inputPath) {
      fs.exists(inputPath, (flag) => {
        resolve(flag);
      });
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
    }, (err) => {

      reject(err);
    });
  });
}

function splitFile(filePath, maxFileSize, outputPath, splitFilePrefix) {
  return new Promise((resolve, reject) => {
    let output = path.join(outputPath, splitFilePrefix);
    let readStream = fs.createReadStream(filePath);
    splitFileStream.split(readStream, maxFileSize, output, (filePaths) => {
      resolve(filePaths);
    });
  });
}
function getFileNum(dir) {
  fs.readdir(dir, function (files) {
    return files.length;
  });
}
function readFileToBuf(filePath) {
  return new Promise((resolve, reject) => {
    var content = new Buffer(0);
    fs.readFile(filePath, function (err, chunk) {
      if (err) {
        //debug(err);
        reject(Error(err));
      }
      content = Buffer.concat([content, chunk]);
      
      resolve(content);
    });
  });

}


module.exports = { isDir, isFile, isExist, getFileHash, tarFunc, splitFile, getFileNum, readFileToBuf };