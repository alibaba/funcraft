'use strict';
const { Server } = require('@webserverless/fc-express');
const express = require('express');

const {
  checkPathServer, 
  checkHasUploadServer,
  checkFileHashServer,
  mergeServer,
  uploadSplitFileServer,
  sendCmdReqServer, 
  uploadFileServer
} = require('./support/server-support');

const app = express();

app.get('/check/is-uploaded', function(req, res) {
  checkHasUploadServer(req, res);
});

app.get('/exe', (req, res) => {
  sendCmdReqServer(req, res);
});

app.post('/upload/split-file', (req, res) => {
  uploadSplitFileServer(req, res);
});

app.post('/upload/file', (req, res) => {
  uploadFileServer(req, res);
});
app.get('/merge', (req, res) => {
  mergeServer(req, res);
});

app.get('/check/path', (req, res) => {
  checkPathServer(req, res);
});

app.get('/check/file', (req, res) => {
  checkFileHashServer(req, res);
});


const server = new Server(app);

// http trigger entry
module.exports.handler = function(req, res, context) {
  server.httpProxy(req, res, context);
};