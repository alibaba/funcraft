'use strict';

const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');

const debug = require('debug')('fun:nas:cp');

const { getFileHash, tarFunc, splitFile } = require('./file-support');
const { endWithSlash, makeTmpDir, getSplitFiles } = require('./path-support');
const { checkPath, checkHasUpload, checkFileHash, merge, uploadFile } = require('./http-request');
const chunkSize = 6 * 1024 * 1024;

function upload(srcPath, dstPath, commonPath, isDir) {
  return new Promise(async function (resolve, reject) {
    
    try {
      var checkPathRes = await checkPath(dstPath, commonPath);
    } catch (error) {
      debug(error);
      console.log('  Path check error : ' + error);
    }
    let checkPathResBody = checkPathRes.data;
    if (checkPathResBody.err !== '') {
      console.log(checkPathResBody.err);
      return;
    }
    if (checkPathResBody.isExist) {
      if (isDir && checkPathResBody.isFile && !checkPathResBody.isDir) {
        console.log(`${dstPath} is a file`);
        debug(`${dstPath} is a file`);
        return;
      }
      let srcFilePath;

      if (isDir) {
        try {
          const t = await tarFunc(srcPath);
          srcFilePath = t;
        } catch (err) {
          console.error(err);
        }
      } else {
        srcFilePath = srcPath;
      }
      
      getFileHash(srcFilePath).then(async function (fileHashValue) {
        let fileName = path.basename(srcFilePath);
        
        if (!isDir && ((checkPathResBody.isFile && path.basename(dstPath) === fileName) || (!checkPathResBody.isFile && checkPathResBody.isDir))) {
          try {
            var checkFileRes = await checkFileHash(dstPath, commonPath, fileHashValue, fileName, checkPathResBody.isFile);
            
          } catch (error) {
            debug(error);
          }

          let checkFileResBody = checkFileRes.data;
          
          if (checkFileResBody.existFlag) {
            console.log(`${srcFilePath} already exists`);
            debug(`${srcFilePath} already exists`);
            return;
          }
        }
        let dirname = path.dirname(srcFilePath);
        let dirFlag = isDir ? 1 : 0;
        let endWithSlashFlag = endWithSlash(srcPath) ? 1 : 0;
        
        makeTmpDir(dirname, '.fun_nas_tmp', fileHashValue).then((tmpDir) => {
          
          splitFile(srcFilePath, chunkSize, tmpDir, fileHashValue).then(async function (splitFilePathArr) {
            
            try {
              var checkHasUploadRes = await checkHasUpload(dstPath, commonPath, fileHashValue, fileName, dirFlag, endWithSlashFlag);
            } catch (error) {
              debug(error);
              console.log('error info : ' + error);
              rimraf.sync(tmpDir);
              
              if (isDir) {
                fs.unlinkSync(srcFilePath);
              }
              return;
            }
            
            let checkHasUploadResBody = checkHasUploadRes.data;
            let checkHasUploadResErr = checkHasUploadResBody.err;
            if (checkHasUploadResErr !== '') {
              console.log(' checkHasUploadResErr : ' + checkHasUploadResErr);
              rimraf.sync(tmpDir);
              
              if (isDir) {
                fs.unlinkSync(srcFilePath);
              }
              return;
            }
            let nasTmpDir = checkHasUploadResBody.nasTmpDir;
            let dstDir = checkHasUploadResBody.dstDir;
            let dstName = checkHasUploadResBody.dstName;
            let uploadedSplitFilesHash = checkHasUploadResBody.uploadedSplitFiles;
            
            getSplitFiles(uploadedSplitFilesHash, splitFilePathArr).then(async function (splitFiles) {
              
              uploadSplitFiles(splitFiles, nasTmpDir, commonPath).then(async function (uploadFlag) {
                if (uploadFlag) {
                  
                  try {
                    var mergeRes = await merge(commonPath, nasTmpDir, dstDir, dstName, fileName, dirFlag, fileHashValue);
                  } catch (error) {
                    debug(error);
                  }
                  let mergeResBody = mergeRes.data;
                  
                  if (mergeResBody.stat === 1) {
                    resolve(true);
                    debug('copy complete');
                    console.log('copy complete');
                  } else {
                    console.log(mergeRes);
                    debug(mergeRes);
                    debug('copy failed');
                    resolve(false);
                    console.log('copy failed');
                  }
                  
                  rimraf.sync(tmpDir);
                  
                  if (isDir) {
                    fs.unlinkSync(srcFilePath);
                  }
                } else {
                  console.log('copy failed');
                  
                  rimraf.sync(tmpDir);
                  
                  if (isDir) {
                    fs.unlinkSync(srcFilePath);
                  }
                }
              }, (err) => {
                debug(err);
                
                rimraf.sync(tmpDir);
                
                if (isDir) {
                  fs.unlinkSync(srcFilePath);
                }
              });
            });

          }).catch(function (err) {
            console.error(err);
            
            rimraf.sync(tmpDir);
            
            if (isDir) {
              fs.unlinkSync(srcFilePath);
            }
          });
        }, function (err) {
          reject(err);
          
          if (isDir) {
            fs.unlinkSync(srcFilePath);
          }
        });
      });
    } else {
      console.log(`${dstPath} not exist`);
    }
  });
}

function uploadSplitFiles(splitFiles, nasTmpDir, commonPath) {
  return new Promise((resolve, reject) => {
    let promiseArr = [];
    Promise.all(splitFiles.map(async function (value) {
      
      let splitFileHash = await getFileHash(value);
      
      let promise = await uploadFile(commonPath, nasTmpDir, splitFileHash, value);

      promiseArr.push(promise);
    })).then(() => {
      Promise.all(promiseArr).then((res) => {
        let idx = 0;
        
        for (let resVal of res) {
          console.log('=====' + idx);
          idx++;
          let resValBody = resVal.data;
          
          if (resValBody.stat === 0) {
            resolve(false);
          }
          if (idx === res.length) {
            resolve(true);
          }
        }
      }).catch(function (e) {
        reject(e);
      });
    });
  });
}
module.exports = { upload };