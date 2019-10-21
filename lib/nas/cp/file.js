'use strict';

const fs = require('fs-extra');
const md5File = require('md5-file/promise');
const path = require('path');
const util = require('util');
const archiver = require('archiver');
const { green, grey } = require('colors');
const { createProgressBar } = require('../../import/utils');
const mkdirp = require('mkdirp-promise');
const read = util.promisify(fs.read);

async function zipWithArchiver(inputPath, localNasTmpDir) {
  if (!await fs.exists(inputPath)) {
    throw new Error('folder not exist: ' + inputPath);
  }
  
  if (await isFile(inputPath)) {
    throw new Error('zipWithArchiver not support a file');
  }
  
  return new Promise(async (resolve, reject) => {

    const targetName = path.basename(inputPath);

    //以当前操作的 unix 时间戳作为临时目录名称
    const curTime = new Date().getTime().toString();
    const zipDstDir = path.join(localNasTmpDir, curTime);
    await mkdirp(zipDstDir);
    
    const zipDst = path.join(zipDstDir, `.fun-nas-generated-${targetName}.zip`);
    
    const bar = createProgressBar(`${green(':zipping')} :bar :current/:total :rate files/s, :percent :elapsed s`, { total: 0 } );

    const output = fs.createWriteStream(zipDst);
    const archive = archiver('zip', {
      zlib: { level: 6 }
    });

    output.on('close', () => {
      console.log(`${green('✔')} ${zipDst} - ${grey('zipped')}`);
      resolve(zipDst);
    });

    archive.on('progress', (progress) => {
      bar.total = progress.entries.total;

      bar.tick({
        total: progress.entries.processed
      });
    });

    archive.on('warning', function (err) {
      console.warn(err);
    });

    archive.on('error', function (err) {
      console.log(`    ${green('x')} ${zipDst} - ${grey('zip error')}`);
      reject(err);
    });

    archive.pipe(output);

    archive.directory(inputPath, false);

    archive.finalize();
  });
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
  const file = await isFile(filePath);

  if (file) {
    return await md5File(filePath);
  } 
  
  throw new Error('get file hash error, target is not a file, target path is: ' + filePath);
}

async function isEmptyDir(dirPath) {
  const files = await fs.readdir(dirPath);
  if (!files.length) { return true; }
  return false;
}


async function getFileSize(filePath) {
  const stat = await fs.lstat(filePath);
  return stat.size;
}
async function readFileChunk(filePath, start, size) {
  const fd = await fs.open(filePath, 'r');
  const chunkBuf = Buffer.alloc(size);
  const bytesRead = await read(fd, chunkBuf, 0, size, start);
  if (bytesRead !== size) {
    throw new Error(`ReadChunkFile function bytesRead not equal read size`);
  }
  await fs.close(fd);
  return chunkBuf;
}

module.exports = {
  isDir,
  isFile,
  getFileHash,
  zipWithArchiver,
  isEmptyDir,
  getFileSize, 
  readFileChunk
};