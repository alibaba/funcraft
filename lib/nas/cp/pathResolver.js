'use strict';

const fs = require('fs');
const path = require('path');
const debug = require('debug')('fun:renderer');

const tar = require('tar-fs');
const USER_HOME = process.env.HOME || process.env.USERPROFILE;


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

function splitNasPath(nasPath) {
  var prefix = 'nas://';
  var mid = nasPath.substr(prefix.length);

  const split = '://';
  const idx = mid.indexOf(split);
  var resolvedNasPath = path.join('/', mid.substr(idx + 3));
  var service = mid.substr(0, idx);

  var res = {
    nasPath: resolvedNasPath,
    serviceName: service
  };
  return res;
}

function tarDir(dirPath) {
  return new Promise((resolve, reject) => {
    
    var dirName = path.basename(dirPath);
    var parentDir = path.dirname(dirPath);
    var tarDst = path.join(parentDir, `.${dirName}.tar`);
    var writeStream = fs.createWriteStream(tarDst);
    
    tar.pack(dirPath).pipe(writeStream);
    writeStream.on('finish', function() {
      resolve(tarDst);
    });
    writeStream.on('error', function(err) {
      reject(err);
    });
  });
}

module.exports = { resolveLocalPath, splitNasPath, tarDir };