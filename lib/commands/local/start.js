'use strict';

const path = require('path');

var express = require('express');
var app = express();

const { red } = require('colors');

const httpSupport = require('./http-support');

const { detectTplPath, getTpl } = require('../../tpl');
const validate = require('../../validate/validate');

const definition = require('../../definition');

const { getDebugPort, getDebugIde } = require('../../debug');

const serverPort = 8000;
const SERVER_CLOSE_TIMEOUT = 5000;

function registerSigintForExpress(server) {
  var sockets = {}, nextSocketId = 0;

  // close express server 
  // https://stackoverflow.com/questions/14626636/how-do-i-shutdown-a-node-js-https-server-immediately/14636625#14636625
  server.on('connection', function (socket) {
    let socketId = nextSocketId;
    sockets[socketId] = socket;
    socket.on('close', function () {
      delete sockets[socketId];
    });
  });

  process.once('SIGINT', () => {
    
    console.log('begin to close server');

    // force close if gracefully closing failed
    // https://stackoverflow.com/a/36830072/6602338
    const serverCloseTimeout = setTimeout(() => {
      console.log('server close timeout, force to close server');

      server.emit('close');

      // if force close failed, exit directly
      setTimeout(() => {
        process.exit(-1); // eslint-disable-line
      }, SERVER_CLOSE_TIMEOUT);
      
    }, SERVER_CLOSE_TIMEOUT);

    // gracefully close server
    server.close(() => {
      clearTimeout(serverCloseTimeout);
    });

    for (let socketId in sockets) {
      if (!{}.hasOwnProperty.call(sockets, socketId)) { continue; }

      sockets[socketId].destroy();
    }
  });
}

function startExpress(app) {

  const server = app.listen(serverPort, function () {
    console.log(`function compute app listening on port ${serverPort}!`);
    console.log();
  });

  registerSigintForExpress(server);
}

async function start(options) {

  const tplPath = await detectTplPath();

  if (!tplPath) {
    throw new Error('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .');
  } else if (path.basename(tplPath).startsWith('template')) {

    await validate(tplPath);

    const tpl = await getTpl(tplPath);

    const debugPort = getDebugPort(options);

    const debugIde = getDebugIde(options);

    const baseDir = path.dirname(tplPath);

    const httpTriggers = definition.findHttpTriggersInTpl(tpl);

    await httpSupport.registerHttpTriggers(app, serverPort, httpTriggers, debugPort, debugIde, baseDir);

    // filter all non http trigger functions
    const functions = definition.findFunctionsInTpl(tpl, (funcitonName, functionRes) => {
      const events = functionRes.Events;

      if (events) {
        const triggers = definition.findHttpTriggersInFunction(functionRes);
        if (triggers.length) {
          return false;
        }
      }

      return true;
    });

    await httpSupport.registerApis(app, serverPort, functions, debugPort, debugIde, baseDir);

    startExpress(app);
  } else {
    throw new Error(red('The template file name must be template.[yml|yaml].'));
  }
}

module.exports = start;
