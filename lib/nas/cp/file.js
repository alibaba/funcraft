'use strict';

const fs = require('fs-extra');
const md5File = require('md5-file/promise');
const path = require('path');

const splitFileFunc = require('split-file');
const archiver = require('archiver');
const { green, grey } = require('colors');
const { createProgressBar } = require('../../import/utils');

async function zipWithArchiver(inputPath) {
  if (!await fs.exists(inputPath)) {
    throw new Error('folder not exist: ' + inputPath);
  }
  
  if (await isFile(inputPath)) {
    throw new Error('zipWithArchiver not support a file');
  }
  
  return new Promise(async (resolve, reject) => {

    const targetName = path.basename(inputPath);
    const parentDir = path.dirname(inputPath);

    const zipDst = path.join(parentDir, `.${targetName}.zip`);
    
    const bar = createProgressBar(`${green(':zipping')} :bar :current/:total :rate files/s, :percent :elapsed`, { total: 0 } );

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

async function splitFile(filePath, maxFileSize, outputPath) {
  let files = [];

  const splitedFiles = await splitFileFunc.splitFileBySize(filePath, maxFileSize);

  for (const splitedFile of splitedFiles) {
    let fileName = path.basename(splitedFile);
    let renamedPath = path.join(outputPath, fileName);

    await fs.rename(splitedFile, renamedPath);

    files.push(renamedPath);
  }
  
  return files;
}

module.exports = {
  isDir,
  isFile,
  getFileHash,
  zipWithArchiver,
  splitFile,
  isEmptyDir
};