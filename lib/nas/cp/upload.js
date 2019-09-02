'use strict';

const path = require('path');
const rimraf = require('rimraf');
const async = require('async');
const { green, red } = require('colors');
const constants = require('../constants');
const { chunk } = require('../support');

const {
  getFileHash,
  zipWithArchiver,
  splitFile
} = require('./file');

const {
  makeTmpDir,
  splitFiles, 
  readDirRecursive
} = require('../path');

const {
  statsRequest,
  checkHasUpload,
  sendMergeRequest,
  uploadSplitFile,
  uploadFile, 
  sendUnzipRequest,
  sendCleanRequest
} = require('../request');

const chunkSize = 5 * 1024 * 1024;

const { createProgressBar } = require('../../import/utils');

async function upload(srcPath, dstPath, nasHttpTriggerPath) {
  console.log('NAS path checking...');

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
    
    await uploadSplitFilesParallel(needToUploadfiles, nasTmpDir, nasHttpTriggerPath);
    

    console.log('Merging split files');
    const mergeRes = await sendMergeRequest(nasHttpTriggerPath, nasTmpDir, dstDir, fileName, zipHash);
    console.log(`${green('✔')} merge done`);

    const mergeResBody = mergeRes.data;
    const nasZipFile = mergeResBody.nasZipFile;
    
    const srcPathFiles = await readDirRecursive(srcPath);
    const filesArrSlicedBySize = chunk(srcPathFiles, constants.FUN_NAS_FILE_COUNT_PER_REQUEST);
    
    console.log('Unzipping file');

    await unzipNasFileParallel(nasHttpTriggerPath, dstDir, nasZipFile, filesArrSlicedBySize);

    console.log('Cleaning');
    await sendCleanRequest(nasHttpTriggerPath, nasZipFile);
    console.log(`${green('✔')} clean done`);
  }

  rimraf.sync(tmpDir);
  rimraf.sync(zipFilePath);
  console.log(`Upload ${srcPath} to ${dstPath} done!`);
  
}

function unzipNasFileParallel(nasHttpTriggerPath, dstDir, nasZipFile, filesArrQueue) {
  return new Promise((resolve, reject) => {
    
    let unzipQueue = async.queue(async (unzipFiles, callback) => {
      try {
        await sendUnzipRequest(nasHttpTriggerPath, dstDir, nasZipFile, unzipFiles);
      } catch (error) {
        // 当解压文件数大于 1 ，默认为解压文件数过多导致 unzip 指令超出指令长度限制导致的解压失败
        // 会将解压文件列表折半拆分后进行重试
        if (unzipFiles.length > 1) {
          console.log('Retry unziping...');
          let retryUnzipFiles = [];
          retryUnzipFiles.push(unzipFiles.slice(0, unzipFiles.length / 2));
          retryUnzipFiles.push(unzipFiles.slice(unzipFiles.length / 2, unzipFiles.length));
          unzipQueue.unshift(retryUnzipFiles);
        } else {  
          // 解压文件数小于 50 个时，认为不是解压文件数过多造成的问题
          // 因此提示用户重新 sync
          console.log(red('Unzip error! Please try aging.'));
          reject(error);
        }
      }
      callback();
    }, constants.FUN_NAS_UPLOAD_PARALLEL_COUNT);

    unzipQueue.drain = () => {
      console.log(`${green('✔')} unzip done`);
      resolve();
    };
    
    unzipQueue.push(filesArrQueue);
  });
}

async function uploadSplitFilesParallel(splitFiles, nasTmpDir, nasHttpTriggerPath) {
  return new Promise((resolve, reject) => {
    let splitFileNum = splitFiles.length;
  
    const bar = createProgressBar(`${green(':uploading')} :bar :current/:total :rate files/s, :percent :elapsed`, { total: splitFileNum });
    let uploadQueue = async.queue(async (splitFile, callback) => {

      try {
        await uploadSplitFile(nasHttpTriggerPath, nasTmpDir, splitFile);
      } catch (error) {
        console.log(red(`${splitFile} upload error : ${error}`));
        reject(error);
      // TO DO RETRY
      }
      bar.tick();
      callback();
    }, constants.FUN_NAS_UPLOAD_PARALLEL_COUNT);

    uploadQueue.drain = () => {
      resolve();
    };

    uploadQueue.push(splitFiles);
  });
}

module.exports = upload;