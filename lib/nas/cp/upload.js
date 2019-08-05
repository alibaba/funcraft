'use strict';

const path = require('path');
const rimraf = require('rimraf');
const PromisePool = require('es6-promise-pool');

const { green } = require('colors');
const constants = require('../constants');
const tips = require('../tips');

const {
  getFileHash,
  zipWithArchiver,
  splitFile
} = require('./file');

const {
  makeTmpDir,
  splitFiles
} = require('../path');

const {
  statsRequest,
  checkHasUpload,
  sendMergeRequest,
  uploadSplitFile,
  uploadFile
} = require('../request');

const chunkSize = 5 * 1024 * 1024;

const { createProgressBar } = require('../../import/utils');

async function upload(srcPath, dstPath, nasHttpTriggerPath) {
  console.log('NAS path checking...');

  // todo: error
  const statsRes = await statsRequest(dstPath, nasHttpTriggerPath);

  const stats = statsRes.data;

  if (!stats.isExist) {
    throw new Error(`${dstPath} not exist`);
  }

  if (stats.isFile && !stats.isDir) {
    throw new Error(`Check error : ${dstPath} is a file, but ${srcPath} is a folder`);
  }

  console.log('zipping ' + srcPath);

  const zipFilePath = await zipWithArchiver(srcPath);
  
  const zipHash = await getFileHash(zipFilePath);

  const fileName = path.basename(zipFilePath);
  const dirname = path.dirname(zipFilePath);

  const tmpDir = await makeTmpDir(dirname, '.fun_nas_tmp', zipHash);

  console.log('generate tmpDir: ' + tmpDir);

  const files = await splitFile(zipFilePath, chunkSize, tmpDir);

  console.log(`Split zip file to ${files.length} small files`);
  
  const checkHasUploadRes = await checkHasUpload(dstPath, nasHttpTriggerPath, zipHash, fileName);

  const checkHasUploadResBody = checkHasUploadRes.data;

  const nasTmpDir = checkHasUploadResBody.nasTmpDir;
  
  const dstDir = checkHasUploadResBody.dstDir;
  const uploadedSplitFilesHash = checkHasUploadResBody.uploadedSplitFiles;
  
  
  if (files.length === 1) { 
    await uploadFile(zipFilePath, dstDir, nasHttpTriggerPath, zipHash, fileName);
    
  } else {
    const needToUploadfiles = await splitFiles(uploadedSplitFilesHash, files);
    
    await uploadSplitFiles(needToUploadfiles, nasTmpDir, nasHttpTriggerPath);

    console.log('Merging split files and unzipping');
    await sendMergeRequest(nasHttpTriggerPath, nasTmpDir, dstDir, fileName, zipHash);
    console.log(`${green('✔')} merge and unzip done`);
  }

  rimraf.sync(tmpDir);
  rimraf.sync(zipFilePath);
  console.log(`Upload ${srcPath} to ${dstPath} done!`);
  tips.showInitNextTips();
}


async function uploadSplitFiles(splitFiles, nasTmpDir, nasHttpTriggerPath) {
  console.log('Uploading split files...');

  let cnt = 0;
  let splitFileNum = splitFiles.length;
  
  const bar = createProgressBar(`${green(':uploading')} :bar :current/:total :rate files/s, :percent :etas`, { total: splitFileNum });

  var promiseProducer = function () {
    if (cnt < splitFileNum) {
      return uploadSplitFile(nasHttpTriggerPath, nasTmpDir, splitFiles[cnt++]);
    }
    return null;
  };

  var pool = new PromisePool(promiseProducer, constants.FUN_NAS_UPLOAD_POOL_SIZE);
  pool.addEventListener('fulfilled', function (event) {
    bar.tick();
  });

  pool.addEventListener('rejected', function (event) {
    throw event.data.error;
  });

  await pool.start();

  console.log(`${green('✔')} files uploaded`);
}


module.exports = upload;