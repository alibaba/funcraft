'use strict';
const fs = require('fs');

const path = require('path');
const url = require('url');
const rimraf = require('rimraf');

const getRawBody = require('raw-body');

const { execute } = require('./cmd-execute');
const { getFileHash, makeDir, isSameFile, mergeFiles, unzipFile, writeBufToFile } = require('./file-support');
const { parseDstPath, filesNameAndHash, readTmpDir, getMergeFileDst } = require('./path-support');

function checkPathServer(req, res) {
  var parseObj = url.parse(req.url, true);
  req.query = parseObj.query;

  const nasDstPath = req.query.dstPath;
  fs.lstat(nasDstPath, (err, stats) => {
    if (err) {
      res.send({
        path: nasDstPath,
        isExist: false,
        isDir: false,
        isFile: false,
        err: err
      });
    } else {
      res.send({
        path: nasDstPath,
        isExist: true,
        isDir: stats.isDirectory(),
        isFile: stats.isFile(),
        err: ''
      });
    }
  });
}

function checkHasUploadServer(req, res) {
  var parseObj = url.parse(req.url, true);
  req.query = parseObj.query;

  const fileHashValue = req.query.fileHashValue;
  const fileName = req.query.fileName;
  const nasDstPath = req.query.dstPath;
  const isDir = (req.query.isDir === 'true');
  const isEndWithSlash = (req.query.isEndWithSlash === 'true');

  parseDstPath(isDir, nasDstPath, fileName, isEndWithSlash).then((parseDstPathRes) => {
    const dstDir = parseDstPathRes.dstDir;
    const dstName = parseDstPathRes.dstName;

    let tmpDir = '';

    if (isDir) {
      tmpDir = path.join(dstDir, dstName, '.fun_nas_tmp', fileHashValue);
    } else {
      tmpDir = path.join(dstDir, '.fun_nas_tmp', fileHashValue);
    }
    fs.lstat(tmpDir, (err, stats) => {
      if (err || stats.isFile()) {
        try {
          makeDir(tmpDir);
          res.send({
            nasTmpDir: tmpDir,
            dstDir: dstDir,
            dstName: dstName,
            uploadedSplitFiles: {},
            err: ''
          });
        } catch (err) {
          console.log(`Function makeDir ${tmpDir} error : ${err}`);
          res.send({
            nasTmpDir: tmpDir,
            dstDir: dstDir,
            dstName: dstName,
            uploadedSplitFiles: {},
            err: `make tmp dir err : ${err}`
          });
        }
      } else {
        filesNameAndHash(tmpDir).then((uploadedSplitFiles) => {
          res.send({
            nasTmpDir: tmpDir,
            dstDir: dstDir,
            dstName: dstName,
            uploadedSplitFiles: uploadedSplitFiles,
            err: ''
          });
        }, function (err) {
          console.log(`Func filesNameAndHash error : ${err}`);
          res.send({
            nasTmpDir: tmpDir,
            dstDir: dstDir,
            dstName: dstName,
            uploadedSplitFiles: {},
            err: `Func filesNameAndHash error : ${err}`
          });
        });
      }
    });
  });
}

function checkFileHashServer(req, res) {
  var parseObj = url.parse(req.url, true);
  req.query = parseObj.query;

  let nasDstPath = req.query.dstPath;
  const srcFileName = req.query.fileName;
  const srcFileHash = req.query.fileHashValue;
  const isNasFile = (req.query.isNasFile === 'true');

  if (isNasFile === 0) {
    nasDstPath = path.join(nasDstPath, srcFileName);
  }
  isSameFile(nasDstPath, srcFileName, srcFileHash).then((flag) => {
    res.send({
      existFlag: flag,
      err: ''
    });
  }, function (err) {
    console.error(`Function isSameFile error : ${err}`);
    res.send({
      existFlag: false,
      err: `Function isSameFile error : ${err}`
    });
  });
}

function mergeServer(req, res) {
  const nasTmpDir = req.query.nasTmpDir;
  const dstDir = req.query.dstDir;
  const dstName = req.query.dstName;
  const fileName = req.query.fileName;
  const isDir = (req.query.isDir === 'true');
  const nasFileHashValue = req.query.fileHashValue;

  const nasFile = getMergeFileDst(dstDir, dstName, fileName, isDir);

  readTmpDir(nasTmpDir).then((splitFilesPaths) => {

    mergeFiles(splitFilesPaths, nasFile).then(() => {
      //hash
      getFileHash(nasFile).then((nasHashValue) => {
        
        if (nasHashValue === nasFileHashValue) {
          if (isDir) {
            let dstPath = path.join(dstDir, dstName);
            unzipFile(nasFile, dstPath).then((unzipdesc) => {

              fs.unlink(nasFile, (err) => {
                console.log(`delete ${nasFile} error : ${err}`);
              });

              rimraf(nasTmpDir, (err) => {
                console.log(`delete ${nasTmpDir} error : ${err}`);
              });

              res.send({
                stat: 1,
                desc: 'Folder saved'
              });
            }).catch(function (err) {
              console.error(`Funntion unzipFile error : ${err}`);
              res.send({
                stat: 0,
                desc: `Funntion unzipFile error : ${err}`
              });
              fs.unlink(nasFile, (err) => {
                console.log(`delete ${nasFile} error : ${err}`);
              });
              rimraf(nasTmpDir, (err) => {
                console.log(`delete ${nasTmpDir} error : ${err}`);
              });
            });
          } else {
            rimraf(nasTmpDir, (err) => {
              console.log(`delete ${nasTmpDir} error : ${err}`);
            });
            res.send({
              stat: 1,
              desc: 'File saved'
            });
          }
        } else {
          if (isDir) {
            fs.unlink(nasFile, (err) => {
              console.log(`delete ${nasFile} error : ${err}`);
            });
          }
          rimraf(nasTmpDir, (err) => {
            console.log(`delete ${nasTmpDir} error : ${err}`);
          });
          res.send({
            stat: 0,
            desc: 'hash changes'
          });
        }
      }, function (err) {
        console.error(`Function getFileHash error : ${err}`);
        res.send({
          stat: 0,
          desc: `Function getFileHash error : ${err}`
        });
        if (isDir) {
          fs.unlink(nasFile, (err) => {
            console.log(`delete ${nasFile} error : ${err}`);
          });
        }
        rimraf(nasTmpDir, (err) => {
          console.log(`delete ${nasTmpDir} error : ${err}`);
        });
      });
    })
      .catch((err) => {
        console.log(`Function mergeFiles error : ${err}`);
        rimraf(nasTmpDir, (err) => {
          console.log(`delete ${nasTmpDir} error : ${err}`);
        });
        fs.lstat(nasFile, (err, stats) => {
          if (!err && stats.isFile()) {
            fs.unlink(nasFile, (err) => {
              console.log(`delete ${nasFile} error : ${err}`);
            });
          }
        });
        res.send({
          stat: 0,
          desc: `Function mergeFiles error : ${err}`
        });
      });
  })
    .catch((err) => {
      console.log(`Read ${nasTmpDir} error : ${err}`);
      res.send({
        stat: 0,
        desc: `Read ${nasTmpDir} error : ${err}`
      });
      rimraf(nasTmpDir, (err) => {
        console.log(`delete ${nasTmpDir} error : ${err}`);
      });
    });
}

function uploadSplitFileServer(req, res) {
  const fileName = req.query.fileName;
  const nasTmpDir = req.query.nasTmpDir;
  const fileHashValue = req.query.fileHashValue;


  getRawBody(req, function (err, data) {
    if (err) {
      res.send({
        stat: 0,
        desc: `Function getRawBody erro : ${err}`
      });
    } else {
      const body = data;
      const dstSplitFile = path.join(nasTmpDir, fileName);
      writeBufToFile(dstSplitFile, body).then(() => {
        getFileHash(dstSplitFile).then((nasSplitFileHash) => {
          if (nasSplitFileHash === fileHashValue) {
            res.send({
              stat: 1,
              desc: `${fileName} send success`
            });
          } else {
            res.send({
              stat: 0,
              desc: `${fileName} hash changes`
            });
            fs.unlink(dstSplitFile);
          }
        }, function (err) {
          console.error(`${fileName} hash err : ${err}`);
          res.send({
            stat: 0,
            desc: `${fileName} hash err : ${err}`
          });
          fs.unlink(dstSplitFile, (err) => {
            console.log(`delete ${dstSplitFile} error : ${err}`);
          });
        });
      }, (err) => {
        console.log(`${fileName} write err : ${err}`);
        res.send({
          stat: 0,
          desc: `${fileName} write err : ${err}`
        });
      });
    }
  });
}

function sendCmdReqServer(req, res) {
  let cmd = req.query.cmd;
  execute(cmd, function (exeRes) {
    console.log(`Exe ${cmd} res : ${exeRes}`);
    res.send(exeRes);
  });
}

function uploadFileServer(req, res) {
  const dstDir = req.query.dstDir;
  const fileHashValue = req.query.fileHashValue;
  const dstName = req.query.dstName;
  const isDir = (req.query.isDir === 'true');
  const fileName = req.query.fileName;
  const nasFile = getMergeFileDst(dstDir, dstName, fileName, isDir);
  getRawBody(req, function (err, data) {
    if (err) {
      res.send({
        stat: 0,
        desc: `Function getRawBody erro : ${err}`
      });
    } else {
      const body = data;
      writeBufToFile(nasFile, body).then(() => {
        getFileHash(nasFile).then((nasFileHash) => {
          if (nasFileHash === fileHashValue) {
            if (isDir) {
              let dstPath = path.join(dstDir, dstName);
              unzipFile(nasFile, dstPath).then((unzipdesc) => {
                fs.unlink(nasFile, (err) => {
                  console.log(`delete ${nasFile} error : ${err}`);
                });
                res.send({
                  stat: 1, 
                  desc: 'Folder saved'
                });
              })
                .catch((err) => {
                  console.error(`Funntion unzipFile error : ${err}`);
                  res.send({
                    stat: 0,
                    desc: `Funntion unzipFile error : ${err}`
                  });
                  fs.unlink(nasFile, (err) => {
                    console.log(`delete ${nasFile} error : ${err}`);
                  });
                });
            } else {
              res.send({
                stat: 1, 
                desc: 'File saved'
              });
            }
            

          } else {
            res.sen({
              stst: 0, 
              desc: `${dstName} hash changes`
            });
            fs.unlink(nasFile, (err) => {
              console.log(`delete ${nasFile} error : ${err}`);
            });
          }
        })
          .catch((err) => {
            console.log(`${nasFile} get hash error : ${err}`);
            res.send({
              stat: 0, 
              desc: `${nasFile} get hash error : ${err}`
            });
            fs.unlink(nasFile, (err) => {
              console.log(`delete ${nasFile} error : ${err}`);
            });
          });
      })
        .catch((err) => {
          console.log(`write buf to ${nasFile} error : ${err}`);
          res.send({
            stat: 0, 
            desc: `write buf to ${nasFile} error : ${err}`
          });
        });
    }
  }); 

}

module.exports = {
  checkPathServer,
  checkHasUploadServer,
  checkFileHashServer,
  mergeServer,
  uploadSplitFileServer,
  sendCmdReqServer, 
  uploadFileServer
};
