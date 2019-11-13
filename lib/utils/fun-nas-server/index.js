'use strict';
const { Server } = require('@webserverless/fc-express');
const express = require('express');
require('express-async-errors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const getRawBody = require('raw-body');
const execute = require('./lib/execute');
const rimraf = require('rimraf');
const path = require('path');
const { makeTmpDir } = require('./lib/path');
const { 
  getFileHash,
  writeBufToFile,
  exists, 
  isDir } = require('./lib/file');

const app = express();
app.use(bodyParser.raw({ limit: '6mb' }));
app.use(bodyParser.json());

app.get('/version', (req, res) => {
  console.log('received version request');

  const versionFilePath = path.posix.join('/', 'code', 'VERSION');
  fs.readFile(versionFilePath, (err, data) => {
    if (err) { res.send({ curVersionId: err }); }
    const curVersionId = data.toString();
    res.send({
      curVersionId
    });
  });
});

app.get('/tmp/check', async(req, res) => {
  console.log('received tmp/check request, query is: ' + req.query);
  const remoteNasTmpDir = req.query.remoteNasTmpDir;
  await makeTmpDir(remoteNasTmpDir);
  res.send({
    desc: 'check tmpDir done!'
  });
});

// check if local file and NAS file are the same via MD5
app.get('/file/check', async(req, res) => {
  console.log('received file/check request, query is: ' + req.query);

  const nasFile = req.query.nasFile;
  const fileHash = req.query.fileHash;

  const nasFileHash = await getFileHash(nasFile);

  if (nasFileHash === fileHash) {
    res.send({
      stat: 1, 
      desc: 'File saved'
    });
  } else {
    rimraf.sync(nasFile);
    throw new Error('file hash changes, you need to re-sync');
  }
});


// exec commands
app.post('/commands', async (req, res) => {
  console.log('received commands request, query is: ' + JSON.stringify(req.query));
  
  const cmd = (req.body).cmd;
  if (!cmd) { throw new Error('missing cmd parameter'); }

  const execRs = await execute(cmd);
  
  res.send(execRs);
});

app.get('/clean', (req, res) => {
  console.log('received clean request, query is: ' + JSON.stringify(req.query));

  const nasZipFile = req.query.nasZipFile;
  
  rimraf.sync(nasZipFile);
  res.send({
    desc: 'clean done'
  });
});

app.post('/file/chunk/upload', async(req, res) => {
  console.log('received file/chunkUpload reqeust, query is: ' + req.query);

  const nasFile = req.query.nasFile;
  const fileStart = parseInt(req.query.fileStart, 10);

  const chunkFileBuf = req.body;

  await writeBufToFile(nasFile, chunkFileBuf, fileStart);
  
  res.send({
    desc: 'chunk file write done'
  });
});

app.get('/stats', async (req, res) => {
  console.log('received stats reqeust, query is: ' + req.query);

  const dstPath = req.query.dstPath;

  if (!dstPath) { throw new Error('missing dstPath parameter'); }

  const parentDirExists = await isDir(path.dirname(dstPath));
  
  if (await exists(dstPath)) {
    const stats = await fs.lstat(dstPath);

    res.send({
      path: dstPath,
      exists: true,
      parentDirExists: parentDirExists, 
      isDir: stats.isDirectory(),
      isFile: stats.isFile(), 
      UserId: stats.uid, 
      GroupId: stats.gid, 
      mode: stats.mode
    });
  } else {
    res.send({
      path: dstPath,
      exists: false,
      parentDirExists: parentDirExists, 
      isDir: false,
      isFile: false
    });
  }
});

app.use((err, req, res, next) => {
  console.error(err);

  res.send({ error: err.message });
});

const server = new Server(app);

module.exports.handler = async (req, res, context) => {
  // getRawBody 需要放在所有 await 函数的前面，获取 req 的 body 
  // 由 app.use 中间件获取 req.body
  const body = await getRawBody(req);

  req.body = body;
  // 设置 server 端的超时时间为 600 秒, 此处单位为毫秒
  server.rawServer.setTimeout(600 * 1000);
  server.httpProxy(req, res, context);

};

module.exports.app = app;