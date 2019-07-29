'use strict';

const path = require('path');
const debug = require('debug')('fun:nas:cp');
const rimraf = require('rimraf'); 
const mkdirp = require('mkdirp');
const { getFileHash } = require('./file-support');
const USER_HOME = process.env.HOME || process.env.USERPROFILE;
const fs = require('fs');

function resolveLocalPath(localPath) {
  var resolvedPath = '';
  if (localPath) {
    if (localPath.indexOf('/') === 0) {
      resolvedPath = localPath;
    } else if (localPath.indexOf('~') === 0) {
      resolvedPath = localPath.replace(/~/, USER_HOME);
    } else {
      var currentDir = process.cwd();
      resolvedPath = path.join(currentDir, localPath);
    }
  } else {
    debug('localPath is empty');
  }
  return resolvedPath;
}

function parseNasPath(nasPath) {
  var prefix = 'nas://';
  
  if (nasPath.indexOf(prefix) !== 0) {
    throw new Error('  nas path err');
  }
  var mid = nasPath.substr(prefix.length);

  const split = '://';
  const idx = mid.indexOf(split);
  if (idx === -1) {
    throw new Error('  nas path err');
  }
  var resolvedNasPath = path.join('/', mid.substr(idx + 3));
  var service = mid.substr(0, idx);

  var res = {
    nasPath: resolvedNasPath,
    serviceName: service
  };
  
  return res;
}



function isNasProtocol(inputPath) {
  if (inputPath.indexOf('nas://') === 0) {
    return true;
  }
  return false;
}

function endWithSlash(inputPath) {
  if (inputPath.length === 0) {
    console.log('Local path is Empty');
  } else {
    if (inputPath.charAt(inputPath.length - 1) === '/') {
      return true;
    } 
  }
  return false;
}

function makeTmpDir(parentDir, tmpDirName, splitDirName) {
  return new Promise((resolve, reject) => {
    let tmpDir = path.join(parentDir, tmpDirName, splitDirName);
    fs.lstat(tmpDir, (err, stats) => {
      if (!err) {
        rimraf.sync(tmpDir);
      }
      mkdirp(tmpDir, function (err) {
        if (err) {
          debug(err);
          
          reject(err);
        }
        else {
          resolve(tmpDir);
        }
      });
    });
  });
}

function splitFiles(uploadedSplitFilesHash, splitFilePathArr) {
  return new Promise((resolve, reject) => {
    let res = [];
    console.log('Splitting file...');
    Promise.all(splitFilePathArr.map(function (value) {
      let splitFile = value;
      if (uploadedSplitFilesHash.hasOwnProperty(value)) {
        getFileHash(splitFile).then((localSplitFileHash) => {
          if (uploadedSplitFilesHash.value !== localSplitFileHash) {
            res.push(splitFile);
          }
        });
      } else {
        res.push(splitFile);
      }
    }))
      .then(() => {
        resolve(res);
      })
      .catch((err) => {
        reject(err);
      });
  });
}
module.exports = { 
  resolveLocalPath, 
  parseNasPath, 
  isNasProtocol, 
  endWithSlash, 
  makeTmpDir, 
  splitFiles 
};