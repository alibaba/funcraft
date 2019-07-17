'use strict';
const { Server } = require('@webserverless/fc-express');
const express = require('express');
const md5File = require('md5-file');
const fs = require('fs');
const splitFileStream = require('split-file-stream');
const path = require('path');
const url = require('url');
const rimraf = require('rimraf');
const MULTIPARTY = require('multiparty');
const mkdirSync = require('mkdirp-sync');
const tar = require('tar-fs');
const exec = require('child_process').exec;

const app = express();

var tmpDir = '';
var dstPath = '';
var fileMD5Value;
var filename = '';
var isDir;
var dstDirName;

app.get('/list', (req, res) => {
  var parseObj = url.parse(req.url, true);
  req.query = parseObj.query;

  var nasPath = req.query.nasPath;
  var listFlag = req.query.listFlag;
  var allFlag = req.query.allFlag;
  function execute(command, callback) {
    exec(command, function(error, stdout, stderr) { callback(stdout); });
  }
  
  var cmd = 'ls ' + ((listFlag !== 'undefined') ? '-l ' : '') + ((allFlag !== 'undefined') ? '-a ' : '') + nasPath; 
  
  execute(cmd, function(lsRes) {
    res.send(lsRes);
  });
});

app.post('/upload', (req, res) => {
  var form = new MULTIPARTY.Form({
    uploadDir: tmpDir 
  });
  form.parse(req, function(err, fields, files) {
    if (err) {
      res.send({
        stat: 0,
        desc: 'err'
      });
    } else {
      res.send({
        stat: 1,
        desc: 'success'
      });
      var parseObj = url.parse(req.url, true);
      req.query = parseObj.query;
    
      
      var chunkSeq = req.query.chunkSeq;
      
      let dstSplitFile = path.resolve(tmpDir, `${fileMD5Value}.split-${chunkSeq}`);
      var inputFile = files.sqlfiles[0];
      var uploadPath = inputFile.path;

      fs.rename(uploadPath, dstSplitFile, function(err) {
        if (err) { console.log('error: ' + err); }
      });
    }
  });

});

app.get('/merge', (req, res) => {
  var parseObj = url.parse(req.url, true);

  req.query = parseObj.query;
  var chunks = req.query.chunks;
  var nasFile;
  if (isDir) {
    nasFile = path.join('/', dstPath, dstDirName, filename);
  } else {
    nasFile = path.join('/', dstPath, filename);
  }
  let splitFilePrefix = `${fileMD5Value}.split-`;

  let splitFilesArr = [];
  for (let i = 0; i < chunks; ++i) {
    let splitFile = path.join(tmpDir, `${splitFilePrefix}${i}`);
    splitFilesArr.push(splitFile);
  }
  splitFileStream.mergeFilesToDisk(splitFilesArr, nasFile, function() {
    md5File(nasFile, function(err, nasFileMD5) {
      if (err) { console.log('md5file err: ' + err); }
      
      if (nasFileMD5 === fileMD5Value) {
        if (isDir) {
          var dstDir = path.join(dstPath, dstDirName);
          console.log('nasfile : ' + nasFile);
          var nasFileReadStream = fs.createReadStream(nasFile);
          nasFileReadStream.on('open', function() {
            nasFileReadStream.pipe(tar.extract(dstDir));
          });

          nasFileReadStream.on('end', function() {
            fs.unlink(nasFile);
          });
          nasFileReadStream.on('error', function(err) {
            console.log(err);
          });
        }
        rimraf.sync(tmpDir);
        res.send({
          stat: 1,
          info: 'complete'
        });
        
      } else {
        if (isDir) {
          fs.unlinkSync(nasFile);
        }
        res.send({
          stat: 0, 
          info: 'fail'
        });
      }
    });
  });
  
});

app.get('/check/file', (req, res) => {
  var result = {};
  var parseObj = url.parse(req.url, true);
  req.query = parseObj.query;
  dstPath = req.query.dstPath;
  
  filename = req.query.filename;
  isDir = req.query.isDir;
  var srcPathLastChar = req.query.srcPathLastChar;

  if (isDir) {
    dstDirName = filename.substring(1);
    dstDirName = dstDirName.substr(0, dstDirName.length - 4);
  } else {
    dstDirName = '';
  }

  fileMD5Value = req.query.fileMD5;

  if (dstPath.lastIndexOf('/') === dstPath.length - 1 && !fs.existsSync(dstPath)) {
    if (isDir) {
      let tmpPath = dstPath;
      dstPath = path.dirname(tmpPath);
      dstDirName = path.basename(tmpPath);
    } else {
      res.send({
        stat: -1,
        isdir: 0  
      });
      return;
    }
  } else if (dstPath.lastIndexOf('/') !== dstPath.length - 1 && fs.existsSync(dstPath)) {
    if (isDir) {
      if (fs.statSync(dstPath).isFile()) {
        res.send({
          stat: -1,
          isdir: 1
        });
        return;
      }
      if (srcPathLastChar === '/') {
        let tmpPath = dstPath;
        dstPath = path.dirname(tmpPath);
        dstDirName = path.basename(tmpPath);
      }
      
    } else {
      if (fs.statSync(dstPath).isFile()) {
        //询问
        //覆盖
        let tmpPath = dstPath;
        dstPath = path.dirname(tmpPath);
        filename = path.basename(tmpPath);
      }
    }
  } else if (dstPath.lastIndexOf('/') !== dstPath.length - 1 && !fs.existsSync(dstPath)) {
    if (isDir) {
      let tmpPath = dstPath;
      dstPath = path.dirname(tmpPath);
      dstDirName = path.basename(tmpPath);
    } else {
      let tmpPath = dstPath;
      dstPath = path.dirname(tmpPath);
      filename = path.basename(tmpPath);
    }
  } else {
    if (isDir && srcPathLastChar === '/') {
      let tmpPath = dstPath;
      dstPath = path.dirname(tmpPath);
      dstDirName = path.basename(tmpPath);
    }
  }
  var nasFile;
  if (isDir) {
    tmpDir = path.join(dstPath, dstDirName, `.${fileMD5Value}`);
    nasFile = path.join(dstPath, dstDirName, filename);

  } else {
    tmpDir = path.join(dstPath, `.${fileMD5Value}`);
    nasFile = path.join(dstPath, filename);
  }
  
  if (fs.existsSync(nasFile) && !isDir) {
    var fcFileMD5Value = md5File.sync(nasFile);
    
    if (fileMD5Value === fcFileMD5Value) {
      result = {
        stat: 1,
        file: {
          isExist: true,
          content: true,
          name: nasFile
        },
        desc: 'file is exist'
      };
    } else {
      if (!fs.existsSync(tmpDir)) {
        mkdirSync(tmpDir, function (err) {
          if (err) { console.error(err); }
        });
      }

      let fileList = fs.readdirSync(tmpDir);
      if (fileList && fileList.length > 0 && fileList[0] === '.DS_Store') {
        fileList.splice(0, 1);
      }

      result = {
        stat: 0,
        chunkList: fileList,
        desc: 'file is exist but different'
      };
    }
  } else {
    if (!fs.existsSync(tmpDir)) {
      mkdirSync(tmpDir, function (err) {
        if (err) { console.error(err); }
      });
    }

    let fileList = fs.readdirSync(tmpDir);
    if (fileList && fileList.length > 0 && fileList[0] === '.DS_Store') {
      fileList.splice(0, 1);
    }
    
    result = {
      stat: 0,
      chunkList: fileList,
      desc: 'folder list'
    };
  }
  
  res.send(result);
});


const server = new Server(app);

// http trigger entry
module.exports.handler = function(req, res, context) {
  server.httpProxy(req, res, context);
};
