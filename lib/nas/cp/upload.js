'use strict';

const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const PromisePool = require('es6-promise-pool');
const debug = require('debug')('fun:nas:cp');

const {
  getFileHash,
  tarFunc,
  splitFile
} = require('./file-support');
const {
  endWithSlash,
  makeTmpDir,
  splitFiles
} = require('./path-support');

const {
  checkPath,
  checkHasUpload,
  checkFileHash,
  merge,
  uploadSplitFile,
  uploadFile
} = require('./http-request');
const chunkSize = 5 * 1024 * 1024;

function upload(srcPath, dstPath, commonPath, isDir) {
  return new Promise(async function (resolve, reject) {

    try {
      console.log('NAS path checking...');
      var checkPathRes = await checkPath(dstPath, commonPath);
    } catch (error) {
      console.log(`Check error: ${error}`);
      debug(`  Path check error : ${error}`);
      return;
    }
    let checkPathResBody = checkPathRes.data;
    if (checkPathResBody.err !== '') {
      
      console.log(`Check error : ${checkPathResBody.err}`);
      debug(`  Path check response error : ${checkPathResBody.err}`);
      return;
    }
    if (checkPathResBody.isExist) {
      if (isDir && checkPathResBody.isFile && !checkPathResBody.isDir) {
        console.log(`Check error : ${dstPath} is a file, but ${srcPath} is a folder`);
        return;
      }
      
      let srcFilePath;

      if (isDir) {
        try {
          console.log('zipping folder...');
          srcFilePath = await tarFunc(srcPath);
          
        } catch (err) {
          console.log(`Zip folder error : ${err}`);
          debug(`  Tar folder error : ${err}`);
          return;
        }

      } else {
        srcFilePath = srcPath;
      }

      getFileHash(srcFilePath).then(async function (fileHashValue) {
        const fileName = path.basename(srcFilePath);
        
        if (!isDir &&
          ((checkPathResBody.isFile && path.basename(dstPath) === fileName) ||
            (!checkPathResBody.isFile && checkPathResBody.isDir))) {
          console.log(`File md5sum : ${fileHashValue}`);
          console.log('Checking file repetition...');
          try {
            
            var checkFileRes = await checkFileHash(dstPath, commonPath, fileHashValue, fileName, checkPathResBody.isFile);
          } catch (error) {
            console.log(`Upload ${srcPath} to ${dstPath} failed!`);
            console.log(`error : ${error}`);
            debug(`  Function checkFileHash error : ${error}`);
            if (isDir) {
              fs.unlink(srcFilePath, (err) => {
                debug(`  delete ${srcFilePath} error : err`);
              });
            }
            return;
          }

          const checkFileResBody = checkFileRes.data;

          if (checkFileResBody.err !== '') {
            console.log(`Upload ${srcPath} to ${dstPath} failed!`);
            console.log(`error : ${checkFileResBody.err}`);
            debug(`  checkFileHash server error : ${checkFileResBody.err}`);

            return;
          }
          if (checkFileResBody.isExist) {
            console.log(`${srcFilePath} already exists`);

            return;
          }
        }
        const dirname = path.dirname(srcFilePath);

        const isEndWithSlash = endWithSlash(srcPath);

        makeTmpDir(dirname, '.fun_nas_tmp', fileHashValue).then((tmpDir) => {

          splitFile(srcFilePath, chunkSize, tmpDir).then(async function (splitFilePathArr) {

            try {
              var checkHasUploadRes = await checkHasUpload(dstPath, commonPath, fileHashValue, fileName, isDir, isEndWithSlash);
            } catch (error) {
              console.log(`Upload ${srcPath} to ${dstPath} failed!`);
              console.log(`error : ${error}`);
              debug('  Function checkHasUpload error : ' + error);
              rimraf(tmpDir, (err) => {
                debug(err);
              });

              if (isDir) {
                fs.unlink(srcFilePath, (err) => {
                  debug(err);
                });
              }
              return;
            }

            const checkHasUploadResBody = checkHasUploadRes.data;
            const checkHasUploadResErr = checkHasUploadResBody.err;
            if (checkHasUploadResErr !== '') {
              console.log(`Upload ${srcPath} to ${dstPath} failed!`);
              console.log(`error : ${checkHasUploadResErr}`);
              debug(` checkHasUpload Response Error : ${checkHasUploadResErr}`);
              rimraf(tmpDir, (err) => {
                debug(err);
              });

              if (isDir) {
                fs.unlink(srcFilePath, (err) => {
                  debug(err);
                });
              }
              return;
            }
            const nasTmpDir = checkHasUploadResBody.nasTmpDir;
            const dstDir = checkHasUploadResBody.dstDir;
            const dstName = checkHasUploadResBody.dstName;
            const uploadedSplitFilesHash = checkHasUploadResBody.uploadedSplitFiles;

            if (splitFilePathArr.length === 1) {
              uploadFile(srcFilePath, dstDir, commonPath, fileHashValue, dstName, isDir, fileName).then((isSuccess) => {
                if (isSuccess) {
                  console.log(`Upload ${srcPath} to ${dstPath} done!`);
                } else {
                  console.log(`Upload ${srcPath} to ${dstPath} failed!`);
                }
                rimraf(tmpDir, (err) => {
                  debug(err);
                });
  
                if (isDir) {
                  fs.unlink(srcFilePath, (err) => {
                    debug(err);
                  });
                }
              })
                .catch((err) => {
                  debug(`  Function uploadFile error : ${err}`);
                  console.log(`Upload ${srcPath} to ${dstPath} failed!`);
                  console.log(`error : ${err}`);
                  rimraf(tmpDir, (err) => {
                    debug(err);
                  });
  
                  if (isDir) {
                    fs.unlink(srcFilePath, (err) => {
                      debug(err);
                    });
                  }
                });
            } else {
              splitFiles(uploadedSplitFilesHash, splitFilePathArr).then((splitFiles) => {
                uploadSplitFiles(splitFiles, nasTmpDir, commonPath).then(async (isAllUploaded) => {
                  if (isAllUploaded) {
                    try {
                      var mergeRes = await merge(commonPath, nasTmpDir, dstDir, dstName, fileName, isDir, fileHashValue);
                    } catch (error) {
                      debug(`  Functnion merge error : ${error}`);
                      console.log(`Upload ${srcPath} to ${dstPath} failed!`);
                      console.log(`error : ${error}`);
                      rimraf(tmpDir, (err) => {
                        debug(err);
                      });

                      if (isDir) {
                        fs.unlink(srcFilePath, (err) => {
                          debug(err);
                        });
                      }
                      return;
                    }
                    const mergeResBody = mergeRes.data;
                    

                    if (mergeResBody.stat === 1) {
                      resolve(true);
                      debug(mergeResBody.desc);
                      console.log(`Upload ${srcPath} to ${dstPath} done!`);
                    } else {
                      console.log(`Upload ${srcPath} to ${dstPath} failed!`);
                      console.log('error : file merge failed');
                      debug(mergeResBody.desc);
                      resolve(false);
                    }

                    rimraf(tmpDir, (err) => {
                      debug(err);
                    });

                    if (isDir) {
                      fs.unlink(srcFilePath, (err) => {
                        debug(err);
                      });
                    }
                  } else {
                    
                    console.log(`Upload ${srcPath} to ${dstPath} failed!`);
                    console.log('error : split file upload failed');
                    rimraf(tmpDir, (err) => {
                      debug(err);
                    });

                    if (isDir) {
                      fs.unlink(srcFilePath, (err) => {
                        debug(err);
                      });
                    }
                  }
                }, (err) => {
                  debug(`  Function uploadSplitFiles error : ${err}`);
                  console.log(`Upload ${srcPath} to ${dstPath} failed!`);
                  console.log(`error : ${err}`);
                  rimraf(tmpDir, (err) => {
                    debug(err);
                  });

                  if (isDir) {
                    fs.unlink(srcFilePath, (err) => {
                      debug(err);
                    });
                  }
                  return;
                });
              });
            }




          }).catch(function (err) {
            debug(`  File split error : ${err}`);
            console.log(`Upload ${srcPath} to ${dstPath} failed!`);
            console.log(`error : ${err}`);
            rimraf(tmpDir, (err) => {
              debug(err);
            });

            if (isDir) {
              fs.unlink(srcFilePath, (err) => {
                debug(err);
              });
            }
          });
        }, function (err) {
          console.log(`Upload ${srcPath} to ${dstPath} failed!`);
          console.log(`error : ${err}`);
          debug(`  tmpDir make error : ${err}`);
          reject(err);
          if (isDir) {
            fs.unlink(srcFilePath, (err) => {
              debug(err);
            });
          }
        });
      })
        .catch((err) => {
          console.log(`Upload ${srcPath} to ${dstPath} failed!`);
          console.log(`error : ${err}`);
          debug(`  Function getFileHash error : ${err}`);
          if (isDir) {
            fs.unlink(srcFilePath, (err) => {
              debug(`  delete ${srcFilePath} error : err`);
            });
          }
        });
    } else {
      console.log(`${dstPath} not exist`);
    }
  });
}

function uploadSplitFiles(splitFiles, nasTmpDir, commonPath) {
  return new Promise((resolve, reject) => {
    console.log('Uploading...');
    let cnt = 0;
    let splitFileNum = splitFiles.length;
    var promiseProducer = function () {
      if (cnt < splitFileNum) {
        return uploadSplitFile(commonPath, nasTmpDir, splitFiles[cnt++]);
      }
      return null;
    };
    var pool = new PromisePool(promiseProducer, 1);
    let uploadedCnt = 0;
    pool.addEventListener('fulfilled', function (event) {
      console.log('=====' + uploadedCnt);
      uploadedCnt++;
    });
    pool.addEventListener('rejected', function (event) {
      reject(event.data.error);
    });
    pool.start()
      .then(() => {
        if (cnt === splitFileNum) {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}
module.exports = { upload };