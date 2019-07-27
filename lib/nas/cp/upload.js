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
const chunkSize = 6 * 1024 * 1024;

function upload(srcPath, dstPath, commonPath, isDir) {
  return new Promise(async function (resolve, reject) {

    try {
      var checkPathRes = await checkPath(dstPath, commonPath);
    } catch (error) {
      console.log(`  Path check error : ${error}`);
      return;
    }
    let checkPathResBody = checkPathRes.data;
    if (checkPathResBody.err !== '') {
      console.log(`  Path check response error : ${checkPathResBody.err}`);
      return;
    }
    if (checkPathResBody.isExist) {
      if (isDir && checkPathResBody.isFile && !checkPathResBody.isDir) {
        console.log(`  ${dstPath} is a file`);
        return;
      }
      let srcFilePath;

      if (isDir) {
        try {
          srcFilePath = await tarFunc(srcPath);
        } catch (err) {
          console.log(`  Tar folder error : ${err}`);
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
          try {
            var checkFileRes = await checkFileHash(dstPath, commonPath, fileHashValue, fileName, checkPathResBody.isFile);
          } catch (error) {
            console.log(`  Function checkFileHash error : ${error}`);
            if (isDir) {
              fs.unlink(srcFilePath, (err) => {
                console.log(`  delete ${srcFilePath} error : err`);
              });
            }
            return;
          }

          const checkFileResBody = checkFileRes.data;

          if (checkFileResBody.err !== '') {
            console.log(`  checkFileHash server error : ${checkFileResBody.err}`);

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

          splitFile(srcFilePath, chunkSize, tmpDir, fileHashValue).then(async function (splitFilePathArr) {

            try {
              var checkHasUploadRes = await checkHasUpload(dstPath, commonPath, fileHashValue, fileName, isDir, isEndWithSlash);
            } catch (error) {
              console.log('  Function checkHasUpload error : ' + error);
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
              console.log(` checkHasUpload Response Error : ${checkHasUploadResErr}`);
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
                  console.log('copy succeed');
                } else {
                  console.log('copy failed');
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
                  console.log(`  Function uploadFile error : ${err}`);
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
                      console.log(`  Functnion merge error : ${error}`);
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
                      console.log('copy succeed');
                    } else {
                      console.log('copy failed');
                      console.log(mergeResBody.desc);
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
                    console.log('  Not all split files uploaded');
                    console.log('copy failed');

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
                  console.log(`  Function uploadSplitFiles error : ${err}`);
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
            console.log(`  File split error : ${err}`);

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
          console.log(`  tmpDir make error : ${err}`);
          reject(err);
          if (isDir) {
            fs.unlink(srcFilePath, (err) => {
              debug(err);
            });
          }
        });
      })
        .catch((err) => {
          console.log(`  Function getFileHash error : ${err}`);
          if (isDir) {
            fs.unlink(srcFilePath, (err) => {
              console.log(`  delete ${srcFilePath} error : err`);
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
    let cnt = 0;
    let splitFileNum = splitFiles.length;
    var promiseProducer = function () {
      if (cnt < splitFileNum) {
        return uploadSplitFile(commonPath, nasTmpDir, splitFiles[cnt++]);
      }
      return null;
    };
    var pool = new PromisePool(promiseProducer, 30);
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