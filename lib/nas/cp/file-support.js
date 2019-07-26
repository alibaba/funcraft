'use strict';

const fs = require('fs');
const md5File = require('md5-file');
const path = require('path');
const splitFileStream = require('split-file-stream');
const archiver = require('archiver');


function tarFunc(inputPath) {
  return new Promise((resolve, reject) => {
    fs.lstat(inputPath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        let targetName = path.basename(inputPath);
        let parentDir = path.dirname(inputPath);

        let zipDst = path.join(parentDir, `.${targetName}.zip`);
        
        var output = fs.createWriteStream(zipDst);
        var archive = archiver('zip', {
          zlib: { level: 9 }
        });
        output.on('close', function() {
          resolve(zipDst);
        });
        
        archive.on('warning', function(err) {
          if (err.code === 'ENOENT') {
            resolve(zipDst);
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
      }
    });
  });
}

function isDir(inputPath) {
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

function isFile(inputPath) {
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
function readFileAsBuf(filePath) {
  return new Promise((resolve, reject) => {
    var content = new Buffer(0);
    fs.readFile(filePath, function (err, chunk) {
      if (err) {
        
        reject(err);
      } else {
        content = Buffer.concat([content, chunk]);
        resolve(content);
      }
    });
  });

}


module.exports = {
  isDir, 
  isFile, 
  getFileHash, 
  tarFunc, 
  splitFile, 
  getFileNum, 
  readFileAsBuf 
};