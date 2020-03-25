'use strict';

const fs = require('fs-extra');
const md5File = require('md5-file/promise');

async function pathJudge(inputPath, type) {
  try {
    const stats = await fs.lstat(inputPath);
    switch (type) {
    case 'exists': return true;
    case 'isFile': return stats.isFile();
    case 'isDir': return stats.isDirectory();
    default: throw new Error('unsupported type in pathJudge function.');
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}
async function isDir(inputPath) {
  return await pathJudge(inputPath, 'isDir');
}

async function isFile(inputPath) {
  return await pathJudge(inputPath, 'isFile');
}

async function exists(inputPath) {
  return await pathJudge(inputPath, 'exists');
}

async function getFileHash(filePath) {

  if (await isFile(filePath)) {
    return await md5File(filePath);
  } 
  throw new Error('get file hash error, target is not a file, target path is: ' + filePath);
  
}

function writeBufToFile(dstPath, buf, start) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(dstPath, {start: start, flags: 'r+'});
    ws.write(buf);
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
  isDir,
  isFile,
  exists,
  getFileHash,
  writeBufToFile
};