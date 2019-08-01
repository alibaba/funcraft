'use strict';
const { Server } = require('@webserverless/fc-express');
const express = require('express');
require('express-async-errors');

const fs = require('fs-extra');

const execute = require('./lib/execute');

const app = express();

app.post('/commands', async (req, res) => {
  console.log('entered commands: ');
  console.log("req.query: " + JSON.stringify(req.query));

  const cmd = req.query.cmd;

  if (!cmd) throw new Error("missing cmd parameter");

  console.log('received cmd: ' + cmd);

  const execRs = await execute(cmd);

  res.send(execRs);
});

app.use((err, req, res, next) => {
  console.error(err);

  res.send({ error: err.message });
});

const server = new Server(app);

module.exports.handler = function (req, res, context) {
  server.httpProxy(req, res, context);
};