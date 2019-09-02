'use strict';

const fs = require('fs-extra');
const md5File = require('md5-file/promise');
const path = require('path');
const PromisePool = require('es6-promise-pool');
const execute = require('./execute');


async function fileNameAndHash(filePath) {

  let fileName = path.basename(filePath);

  const fileHash = await getFileHash(filePath);

  return {
    fileName,
    fileHash
  };
}

async function filesNameAndHash(tmpDir) {
  console.log('filesNameAndHash for ' + tmpDir);
  const files = await fs.readdir(tmpDir);

  console.log('tmpDir files: ' + JSON.stringify(files));

  const splitFileNum = files.length;
  
  let cnt = 0;
  var promiseProducer = function () {
    if (cnt < splitFileNum) {
      const splitFile = path.join(tmpDir, files[cnt]);
      cnt++;

      console.log('promise produce for ' + splitFile);

      return fileNameAndHash(splitFile);
    }
    return null;
  };
  
  let splitFilesMapHash = {};
  var pool = new PromisePool(promiseProducer, 4);

  pool.addEventListener('fulfilled', function (event) {
    const fileName = event.data.result.fileName;
    const fileHash = event.data.result.fileHash;

    console.log('pool fufilled, fileName: ' + fileName + ' fileHash: ' + fileHash);

    splitFilesMapHash[fileName] = fileHash;
    
  });

  pool.addEventListener('rejected', function (event) {
    console.error('pool rejected', event.data.error);
    
  });

  await pool.start();
  
  return splitFilesMapHash;
  
}

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


function writeBufToFile(dstPath, buf) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(dstPath);
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
async function unzipFile(zipFile, dstPath) {
  const cmd = `unzip -o -q ${zipFile} -d ${dstPath}`;
  const execRs = await execute(cmd);
  console.log(`${cmd} stdout: ${execRs.stdout}`);
  console.log(`${cmd} stderr: ${execRs.stderr}`);
}

module.exports = {
  isDir,
  isFile,
  getFileHash,
  unzipFile,
  writeBufToFile,
  fileNameAndHash,
  filesNameAndHash
};