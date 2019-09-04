'use strict';

const fs = require('fs-extra');
const md5File = require('md5-file/promise');

async function isDir(inputPath) {
  const stats = await fs.lstat(inputPath);

  return stats.isDirectory();
}

async function isFile(inputPath) {
  const stats = await fs.lstat(inputPath);

  return stats.isFile();
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
  getFileHash,
  writeBufToFile
};