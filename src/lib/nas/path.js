'use strict';

const fs = require('fs-extra');
const path = require('path');
const walkdir = require('walkdir');

const { red } = require('colors');
const { isEmptyDir } = require('./cp/file');

const _ = require('lodash');

// Windows 下 process.env.HOME、process.env.USERPROFILE 均返回用户 home 目录
// macOS 下 process.env.HOME 返回用户 home 目录，process.env.USERPROFILE 和 process.env.HOMEPATH均返回 undefined
// 其他系统未知，这样写可以覆盖到不同操作系统的情况
const USER_HOME = require('os').homedir();
// 正常 nasUri 示例 : nas://$(serviceName)$(mountDir) 或者 nas://$(serviceName):$(mountDir)
// 当 template.yml 中只存在单个服务时，上述 $(serviceName) 可以省略不写
const NAS_URI_PATTERN = /^nas:\/\/([^/:]*):?((?:\/[^/]+)*\/?)$/;
const SERVICE_NAME_REGEX_INDEX = 1;
const PATH_NAME_REGEX_INDEX = 2;

function resolveLocalPath(localPath) {
  if (!localPath) { throw new Error(red('local path could not be empty')); }

  const rootDir = path.parse(process.cwd()).root;
  if (localPath.startsWith(rootDir)) {
    return localPath;
  } else if (localPath.startsWith('~')) {
    return localPath.replace(/~/, USER_HOME);
  }
  const currentDir = process.cwd();
  return path.join(currentDir, localPath);
}

function parseNasUri(nasUri) {
  const res = nasUri.match(NAS_URI_PATTERN);
  if (!res) {
    throw new Error(red(`invalid nas path : ${nasUri}`));
  }
  return {
    nasPath: res[PATH_NAME_REGEX_INDEX],
    serviceName: res[SERVICE_NAME_REGEX_INDEX]
  };
}

function isNasProtocol(inputPath) {
  return inputPath.indexOf('nas://') === 0;
}

function endWithSlash(inputPath) {
  if (inputPath.length === 0) {
    throw new Error(red('Local path could not be Empty'));
  }
  return inputPath.charAt(inputPath.length - 1) === '/';
}

function readDirRecursive(rootPath) {
  return new Promise((resolve, reject) => {

    const relativePaths = [];

    if (isEmptyDir(rootPath)) { return resolve(relativePaths); }

    walkdir(rootPath, {
      'track_inodes': true
    })
      .on('path', (fullPath, stat) => {

        let relativePath = path.relative(rootPath, fullPath);

        if (process.platform === 'win32') {
          relativePath = relativePath.split(path.sep).join('/');
        }

        if (stat.isDirectory()) {
          if (!_.isEmpty(fs.readdirSync(fullPath))) { return; }
        
          relativePath = `${relativePath}/`;
        
        }

        relativePaths.push(relativePath);
      })
      .on('end', (path, stat) => resolve(relativePaths));
  });
}

module.exports = {
  resolveLocalPath,
  parseNasUri,
  isNasProtocol,
  endWithSlash,
  readDirRecursive
};