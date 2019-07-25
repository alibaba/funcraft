'use strict';
const { Server } = require('@webserverless/fc-express');
const express = require('express');

const fs = require('fs');

const path = require('path');
const url = require('url');
const rimraf = require('rimraf');

const getRawBody = require('raw-body');


const { execute } = require('./support/cmd-execute');
const { isDir, isFile, isExist, getFileHash, makeDir, sameFileJudgement, mergeFiles, unzipFile, writeBufToFile } = require('./support/file-support');
const { parseDstPath, readTmpFilePathAndHash, readTmpDir, getMergeFileDst } = require('./support/path-support');
const app = express();

app.get('/list', (req, res) => {
  var parseObj = url.parse(req.url, true);
  req.query = parseObj.query;

  var nasPath = req.query.nasPath;
  var listFlag = req.query.listFlag;
  var allFlag = req.query.allFlag;
  
  var cmd = 'ls ' + ((listFlag !== 'undefined') ? '-l ' : '') + ((allFlag !== 'undefined') ? '-a ' : '') + nasPath; 
  
  execute(cmd, function(lsRes) {
    res.send(lsRes);
  });
});

app.get('/check/hasUpload', function(req, res) {
  var parseObj = url.parse(req.url, true);
  req.query = parseObj.query;

  let fileHashValue = req.query.fileHashValue;
  let fileName = req.query.fileName;
  let nasDstPath = req.query.dstPath;
  let dirFlag = +req.query.dirFlag;
  let endWithSlashFlag = +req.query.endWithSlashFlag;
  
  parseDstPath(dirFlag, nasDstPath, fileName, endWithSlashFlag).then((parseDstPathRes) => {
    let dstDir = parseDstPathRes.dstDir;
    let dstName = parseDstPathRes.dstName;
    
    //detect tmp folder 
    let tmpDir = '';
    
    if (dirFlag === 1) {
      tmpDir = path.join(dstDir, dstName, '.fun_nas_tmp', `${fileHashValue}`);
    } else {
      tmpDir = path.join(dstDir, '.fun_nas_tmp', `${fileHashValue}`);
    }
    isExist(tmpDir).then((flag) => {
      
      if (flag) {
        isDir(tmpDir).then((nasDirFlag) => {
          if (nasDirFlag) {
            readTmpFilePathAndHash(tmpDir, fileHashValue).then((uploadedSplitFiles) => {
              res.send({
                nasTmpDir: tmpDir,
                dstDir: dstDir,
                dstName: dstName,
                uploadedSplitFiles: uploadedSplitFiles
              });
            }, function (err) {
              console.error(err);
            });
          } else {
            try {
              makeDir(tmpDir);
            } catch (err) {
              console.error(err);
            }

            res.send({
              nasTmpDir: tmpDir,
              dstDir: dstDir,
              dstName: dstName,
              uploadedSplitFiles: {}
            });
          }
        }, (err) => {
          console.error(err);
        });
      } else {
        //mkdir
        try {
          makeDir(tmpDir);
        } catch (err) {
          console.error(err);
        }
        res.send({
          nasTmpDir: tmpDir,
          dstDir: dstDir,
          dstName: dstName,
          uploadedSplitFiles: {}
        });
      }

    }).catch(function (err) {
      console.error(err);
    });
  });
});
app.get('/exe', (req, res) => {
  let cmd = req.query.cmd;
  
  execute(cmd, function(exeRes) {
    res.send(exeRes);
  });
});
app.post('/upload', (req, res) => {
  let fileName = req.query.fileName;
  let nasTmpDir = req.query.nasTmpDir;
  let fileHashValue = req.query.fileHashValue;
  getRawBody(req, function (err, data) {
    if (err) {
      
      res.send({
        stat: 0,
        desc: 'err'
      });
    } else {
      var body = data;
      let dstSplitFile = path.resolve(nasTmpDir, fileName);
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
              desc: `${fileName} send fail`
            });
            //delete the uploaded file
            fs.unlinkSync(dstSplitFile);
          }
        }, function (err) {
          console.error(err);
          res.send({
            stat: 0,
            desc: `${fileName} hash err`
          });
          fs.unlinkSync(dstSplitFile);
        });
      }, (err) => {
        console.log('error: ' + err);
        res.send({
          stat: 0,
          desc: `${fileName} write err`
        });
      });
    }
  });
});


app.get('/merge', (req, res) => {
  var parseObj = url.parse(req.url, true);

  req.query = parseObj.query;
  let nasTmpDir = req.query.nasTmpDir;
  let dstDir = req.query.dstDir;
  let dstName = req.query.dstName;
  let fileName = req.query.fileName;
  let dirFlag = +req.query.dirFlag;
  let nasFilefileHashValue = req.query.fileHashValue;

  let nasFile = getMergeFileDst(dstDir, dstName, fileName, dirFlag);

  readTmpDir(nasTmpDir).then((splitFilesPaths) => {
    
    mergeFiles(splitFilesPaths, nasFile).then(() => {
      //hash
      getFileHash(nasFile).then((nasHashValue) => {
        
        if (nasHashValue === nasFilefileHashValue) {
          if (dirFlag === 1) {

            //fs.unlinkSync(nasFile);
            let dstPath = path.join(dstDir, dstName);
            unzipFile(nasFile, dstPath).then((unzipInfo) => {
              
              rimraf.sync(nasTmpDir);
              fs.unlinkSync(nasFile);
              res.send({
                stat: 1,
                info: 'complete'
              });
            }).catch(function (err) {
              console.error(err);
              res.send({
                stat: 0,
                info: 'merge fail'
              });
              rimraf.sync(nasTmpDir);
            });
          } else {
            rimraf.sync(nasTmpDir);
            res.send({
              stat: 1,
              info: 'complete'
            });
          }
        } else {
          
          if (dirFlag === 1) {
            fs.unlinkSync(nasFile);
          }
          rimraf.sync(nasTmpDir);
          res.send({
            stat: 0,
            info: 'hash changes'
          });
        }
      }, function (err) {
        console.error(err);
        res.send({
          stat: 0,
          info: 'get hash err'
        });
        if (dirFlag === 1) {
          fs.unlinkSync(nasFile);
        }
        rimraf.sync(nasTmpDir);
      });
    });
  });
});

app.get('/check/path', (req, res) => {
  var parseObj = url.parse(req.url, true);
  req.query = parseObj.query;

  var nasDstPath = req.query.dstPath;
  
  isExist(nasDstPath).then((flag) => {
    if (flag) {
      isDir(nasDstPath).then((dirFlag) => {
        isFile(nasDstPath).then((fileFlag) => {
          res.send({
            path: nasDstPath,
            isExist: flag,
            isDir: dirFlag,
            isFile: fileFlag,
            isErr: false
          });
        }, function(err) {
          console.error(err);
          res.send({
            path: nasDstPath,
            isExist: false,
            isDir: false,
            isFile: false,
            isErr: true
          });
        });
      }, function(err) {
        console.error(err);
        res.send({
          path: nasDstPath,
          isExist: false,
          isDir: false,
          isFile: false,
          isErr: true
        });
      });
    } else {
      res.send({
        path: nasDstPath,
        isExist: false,
        isDir: false,
        isFile: false,
        isErr: false
      });
    }
      
  }, (err) => {
    console.error(err);
  });
});

app.get('/check/file', (req, res) => {
  var parseObj = url.parse(req.url, true);
  req.query = parseObj.query;

  let nasDstPath = req.query.dstPath;
  let srcFileName = req.query.fileName;
  let srcFileHash = req.query.fileHashValue;

  sameFileJudgement(nasDstPath, srcFileName, srcFileHash).then((flag) => {
    res.send({
      existFlag: flag,
      err: false
    });
  }, function(err) {
    console.error(err);
    res.send({
      existFlag: false, 
      err: true
    });
  });
});


const server = new Server(app);

// http trigger entry
module.exports.handler = function(req, res, context) {
  server.httpProxy(req, res, context);
};
