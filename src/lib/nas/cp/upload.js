'use strict';

const path = require('path');
const debug = require('debug')('fun:nas:upload');
const rimraf = require('rimraf');
const async = require('async');
const constants = require('../constants');

const { green, red } = require('colors');
const { readDirRecursive } = require('../path');
const { createProgressBar } = require('../../import/utils');
const { chunk, splitRangeBySize } = require('../support');
const { getFileHash, zipWithArchiver, getFileSize, getFilePermission } = require('./file');

const {
  sendUnzipRequest,
  sendCleanRequest,
  createSizedNasFile,
  uploadChunkFile,
  checkFileHash,
  checkRemoteNasTmpDir,
  changeNasFilePermission
} = require('../request');

async function uploadFolder(srcPath, dstPath, nasHttpTriggerPath, localNasTmpDir, noClobber) {
  console.log('zipping ' + srcPath);
  const zipFilePath = await zipWithArchiver(srcPath, localNasTmpDir);
  const zipFileSize = await getFileSize(zipFilePath);
  const fileOffSetCutByChunkSize = splitRangeBySize(0, zipFileSize, constants.FUN_NAS_CHUNK_SIZE);
  const zipHash = await getFileHash(zipFilePath);

  const fileName = path.basename(zipFilePath);

  const remoteNasTmpDir = path.posix.join(dstPath, '.fun_nas_tmp');
  debug(`checking NAS tmp dir ${remoteNasTmpDir}`);
  await checkRemoteNasTmpDir(nasHttpTriggerPath, remoteNasTmpDir);
  debug(`${green('✔')} check done`);
  const nasZipFile = path.posix.join(remoteNasTmpDir, fileName);
  debug(`Creating ${zipFileSize} bytes size file: ${nasZipFile}`);
  await createSizedNasFile(nasHttpTriggerPath, nasZipFile, zipFileSize);

  debug(`${green('✔')} create done`);

  await uploadFileByChunk(nasHttpTriggerPath, nasZipFile, zipFilePath, fileOffSetCutByChunkSize);

  debug(`checking uploaded NAS zip file ${nasZipFile} hash`);
  await checkFileHash(nasHttpTriggerPath, nasZipFile, zipHash);
  debug(`${green('✔')} hash unchanged`);

  console.log('unzipping file');
  const srcPathFiles = await readDirRecursive(srcPath);
  const unzipFilesCount = srcPathFiles.length;
  const filesArrSlicedBySize = chunk(srcPathFiles, constants.FUN_NAS_FILE_COUNT_PER_REQUEST);
  await unzipNasFileParallel(nasHttpTriggerPath, dstPath, nasZipFile, filesArrSlicedBySize, unzipFilesCount, noClobber);
  debug('cleaning');
  await sendCleanRequest(nasHttpTriggerPath, nasZipFile);
  debug(`${green('✔')} clean done`);

  rimraf.sync(zipFilePath);
  console.log(`${green('✔')} upload completed!`);
}

async function uploadFile(resolvedSrc, actualDstPath, nasHttpTriggerPath) {
  const fileSize = await getFileSize(resolvedSrc);
  const fileOffSetCutByChunkSize = splitRangeBySize(0, fileSize, constants.FUN_NAS_CHUNK_SIZE);
  const fileHash = await getFileHash(resolvedSrc);
  const filePermission = await getFilePermission(resolvedSrc);

  debug(`Creating ${fileSize} bytes size file: ${actualDstPath}`);
  await createSizedNasFile(nasHttpTriggerPath, actualDstPath, fileSize);
  debug(`${green('✔')} create done`);

  await uploadFileByChunk(nasHttpTriggerPath, actualDstPath, resolvedSrc, fileOffSetCutByChunkSize);
  await changeNasFilePermission(nasHttpTriggerPath, actualDstPath, filePermission);

  debug(`checking uploaded file ${actualDstPath} hash`);
  await checkFileHash(nasHttpTriggerPath, actualDstPath, fileHash);
  debug(`${green('✔')} hash unchanged`);

  console.log(`${green('✔')} upload completed!`);
}

function unzipNasFileParallel(nasHttpTriggerPath, dstDir, nasZipFile, filesArrQueue, unzipFilesCount, noClobber) {
  return new Promise((resolve, reject) => {
    const bar = createProgressBar(`${green(':unzipping')} :bar :current/:total :rate files/s, :percent :elapsed s`, { total: unzipFilesCount });
    let unzipQueue = async.queue(async (unzipFiles, next) => {
      try {
        await sendUnzipRequest(nasHttpTriggerPath, dstDir, nasZipFile, unzipFiles, noClobber);
        bar.tick(unzipFiles.length);
      } catch (error) {
        // zip 中存在特殊文件名，例如 $data.js
        if (error.message && error.message.includes('filename not matched')) {
          console.log(red(error));
          return;
        }
        if (error.message && error.message.toLowerCase().includes('permission denied')) {
          //TODO : 权限问题更加详细的提示
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
      next();
    }, constants.FUN_NAS_UPLOAD_PARALLEL_COUNT);

    unzipQueue.drain = () => {
      console.log(`${green('✔')} unzip done`);
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

module.exports = {
  uploadFolder,
  uploadFile
};