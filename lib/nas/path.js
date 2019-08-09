'use strict';

const path = require('path');
const debug = require('debug')('fun:nas:cp');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const { getFileHash } = require('./cp/file');
const USER_HOME = process.env.HOME || process.env.USERPROFILE;
const fs = require('fs');

function resolveLocalPath(localPath) {
  if (!localPath) { throw new Error('local path could not be empty'); }

  const rootDir = path.parse(process.cwd()).root;
  if (localPath.startsWith(rootDir)) {
    return localPath;
  } else if (localPath.startsWith('~')) {
    return localPath.replace(/~/, USER_HOME);
  } 
  var currentDir = process.cwd();
  return path.join(currentDir, localPath);
}

function parseNasPath(nasPath) {
  var prefix = 'nas://';

  if (nasPath.indexOf(prefix) !== 0) {
    throw new Error('nas path err: ' + nasPath);
  }
  var mid = nasPath.substr(prefix.length);

  const split = ':/';

  const idx = mid.indexOf(split);

  if (idx === -1) {
    throw new Error('nas path err: ' + nasPath);
  }
  var resolvedNasPath = path.posix.join('/', mid.substr(idx + split.length));
  
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
    throw new Error('Local path could not be Empty');
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

async function splitFiles(uploadedSplitFilesHash, splitFilePathArr) {
  let res = [];

  for (let splitFile of splitFilePathArr) {    
    if ( uploadedSplitFilesHash.hasOwnProperty(path.basename(splitFile)) ) {
      const localSplitFileHash = await getFileHash(splitFile);

      if (uploadedSplitFilesHash[path.basename(splitFile)] !== localSplitFileHash) {
        res.push(splitFile);
      }
      
    } else {
      res.push(splitFile);
    }
  }

  return res;
}

module.exports = {
  resolveLocalPath,
  parseNasPath,
  isNasProtocol,
  endWithSlash,
  makeTmpDir,
  splitFiles
};