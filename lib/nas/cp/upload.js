'use strict';

const path = require('path');
const rimraf = require('rimraf');
const async = require('async');
const { green, red } = require('colors');
const constants = require('../constants');
const { 
  chunk,  
  splitRangeBySize } = require('../support');

const {
  getFileHash,
  zipWithArchiver,
  getFileSize
} = require('./file');

const {
  readDirRecursive
} = require('../path');

const {
  statsRequest,
  sendUnzipRequest,
  sendCleanRequest, 
  createSizedNasFile, 
  uploadChunkFile,
  checkFileHash
} = require('../request');

const { createProgressBar } = require('../../import/utils');

async function upload(srcPath, dstPath, nasHttpTriggerPath, recursive, nasTmpDir) {
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
  const zipFilePath = await zipWithArchiver(srcPath, nasTmpDir);
  const zipFileSize = await getFileSize(zipFilePath);
  const fileOffSetCutByChunkSize = splitRangeBySize(0, zipFileSize, constants.FUN_NAS_CHUNK_SIZE);
  const zipHash = await getFileHash(zipFilePath);

  const fileName = path.basename(zipFilePath);
  const nasZipFile = path.posix.join(dstPath, fileName);

  await createSizedNasFile(nasHttpTriggerPath, nasZipFile, zipFileSize);
  
  console.log(`${green('✔')} create done`);

  await uploadFileByChunk(nasHttpTriggerPath, nasZipFile, zipFilePath, fileOffSetCutByChunkSize);

  console.log('Checking uploaded NAS zip file hash');
  await checkFileHash(nasHttpTriggerPath, nasZipFile, zipHash);
  console.log(`${green('✔')} hash unchanged`);

  console.log('Unzipping file');
  const srcPathFiles = await readDirRecursive(srcPath);
  const unzipFilsCount = srcPathFiles.length;
  const filesArrSlicedBySize = chunk(srcPathFiles, constants.FUN_NAS_FILE_COUNT_PER_REQUEST);
  await unzipNasFileParallel(nasHttpTriggerPath, dstPath, nasZipFile, filesArrSlicedBySize, unzipFilsCount);
  console.log('Cleaning');
  await sendCleanRequest(nasHttpTriggerPath, nasZipFile);
  console.log(`${green('✔')} clean done`);

  rimraf.sync(zipFilePath);
  console.log(`Upload ${srcPath} to ${dstPath} done!`);
}


function unzipNasFileParallel(nasHttpTriggerPath, dstDir, nasZipFile, filesArrQueue, unzipFilsCount) {
  return new Promise((resolve, reject) => {
    const bar = createProgressBar(`${green(':unzipping')} :bar :current/:total :rate files/s, :percent :elapsed s`, { total: unzipFilsCount });
    let unzipQueue = async.queue(async (unzipFiles, callback) => {
      try {
        await sendUnzipRequest(nasHttpTriggerPath, dstDir, nasZipFile, unzipFiles);
        bar.tick(unzipFiles.length);
      } catch (error) {
        // 出现这样的错误是因为待解压文件列表不在上传的 NAS 端压缩文件
        // 这种情况是压缩包上传出错
        if ((error.message).contains('filename not matched')) {
          console.log(red(error));
          console.log(red('Uploaded NAS zip file error, please re-sync.'));
          return;
        }
        if ((error.message.toLowerCase()).contains('permission denied')) {
          //TO DO : 权限问题更加详细的提示
          console.log(red(error));
          return;
        }
        // 当解压文件数大于 1 ，默认为解压文件数过多导致 unzip 指令超出指令长度限制导致的解压失败
        // 会将解压文件列表折半拆分后进行重试
        if (unzipFiles.length > 1) {
          console.log('Retry unziping...');
          let retryUnzipFiles = [];
          retryUnzipFiles.push(unzipFiles.slice(0, unzipFiles.length / 2));
          retryUnzipFiles.push(unzipFiles.slice(unzipFiles.length / 2, unzipFiles.length));
          unzipQueue.unshift(retryUnzipFiles);
        } else {  
          // 解压文件数小于 1 个时，认为不是解压文件数过多造成的问题
          // 因此提示用户重新 sync
          console.log(red(error));
          console.log(red('Unzip error! Please re-sync.'));
          return;
        }
        
        
      }
      callback();
    }, constants.FUN_NAS_UPLOAD_PARALLEL_COUNT);

    unzipQueue.drain = () => {
      console.log(`\n${green('✔')} unzip done`);
      resolve();
    };
    
    unzipQueue.push(filesArrQueue);
  });
}
function uploadFileByChunk(nasHttpTriggerPath, nasZipFile, zipFilePath, fileOffSet) {
  return new Promise((resolve, reject) => {
    let chunks = fileOffSet.length;
    const bar = createProgressBar(`${green(':uploading')} :bar :current/:total :rate files/s, :percent :elapsed s`, { total: chunks });
    let uploadQueue = async.queue(async(offSet, callback) => {
      try {
        await uploadChunkFile(nasHttpTriggerPath, nasZipFile, zipFilePath, offSet);
      } catch (error) {
        console.log(red(`upload error : ${error.message}`));
        
        return;
      // TO DO：RETRY
      }
      bar.tick();
      callback();
    }, constants.FUN_NAS_UPLOAD_PARALLEL_COUNT);
    uploadQueue.drain = () => {
      console.log(`${green('✔')} upload done`);
      resolve();
    };

    uploadQueue.push(fileOffSet);
  });
}

module.exports = upload;