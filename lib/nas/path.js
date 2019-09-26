'use strict';

const path = require('path');
const { red } = require('colors');
const readdirp = require('readdirp');

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
  var currentDir = process.cwd();
  return path.join(currentDir, localPath);
}

function parseNasUri(nasUri) {
  const res = nasUri.match(NAS_URI_PATTERN);
  if (!res) {
    throw new Error(red(`invalid nas path : ${nasUri}`));
  } else {
    return {
      nasPath: res[PATH_NAME_REGEX_INDEX], 
      serviceName: res[SERVICE_NAME_REGEX_INDEX]
    };
  }
}


function isNasProtocol(inputPath) {
  if (inputPath.indexOf('nas://') === 0) {
    return true;
  }
  return false;
}

function endWithSlash(inputPath) {
  if (inputPath.length === 0) {
    throw new Error(red('Local path could not be Empty'));
  } else {
    if (inputPath.charAt(inputPath.length - 1) === '/') {
      return true;
    }
  }
  return false;
}

async function readDirRecursive(dirPath) {
  const files = await readdirp.promise(dirPath);
  const fileRelativePaths = [];
  // windows 下需要将压缩文件路径住转换为 POXIS 路径
  if (process.platform === 'win32') {
    files.map(file => fileRelativePaths.push((file.path).split(path.sep).join('/')));
  } else {
    files.map(file => fileRelativePaths.push(file.path));
  }
  
  return fileRelativePaths;
}

module.exports = {
  resolveLocalPath,
  parseNasUri,
  isNasProtocol,
  endWithSlash,
  readDirRecursive
};