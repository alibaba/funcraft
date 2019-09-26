'use strict';

const path = require('path');
var express = require('express');
var app = express();
const validate = require('../../validate/validate');
const definition = require('../../definition');
const httpSupport = require('./http-support');
const EventStart = require('../../local/event-start');

const { detectTplPath, getTpl, validateYmlName } = require('../../tpl');
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

async function start(options, invokeName = '') {

  const tplPath = await detectTplPath();

  if (!tplPath) {
    throw new Error('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .');
  }

  validateYmlName(tplPath);

  await validate(tplPath);

  const tpl = await getTpl(tplPath);

  const debugPort = getDebugPort(options);
  const debugIde = getDebugIde(options);
  const debuggerPath = options.debuggerPath;
  const debugArgs = options.debugArgs;
  const baseDir = path.dirname(tplPath);

  let httpTriggers = definition.findHttpTriggersInTpl(tpl);

  const [ serviceName, functionName ] = definition.parseFunctionPath(invokeName);

  if (functionName) {
    const httpTrigger = httpTriggers.filter((trigger) => {
      return serviceName ? serviceName === trigger.serviceName && functionName === trigger.functionName
        : functionName === trigger.functionName;
    });
    if (httpTrigger.length === 0) {
      // if specify event trigger function, then directly start container
      const {
        serviceName,
        serviceRes,
        functionName,
        functionRes
      } = definition.findFunctionInTpl(invokeName, tpl);
      const eventStart = new EventStart(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir);
      await eventStart.init();
      return;
    }
    if (httpTrigger.length > 1) {
      throw new Error(`${invokeName} is not unique`);
    }
    
    await httpSupport.registerSingleHttpTrigger(app, serverPort, httpTrigger[0], debugPort, debugIde, baseDir, true, debuggerPath, debugArgs);
    startExpress(app);
    return;
  }

  await httpSupport.registerHttpTriggers(app, serverPort, httpTriggers, debugPort, debugIde, baseDir, debuggerPath, debugArgs);

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

  await httpSupport.registerApis(app, serverPort, functions, debugPort, debugIde, baseDir, debuggerPath, debugArgs);

  startExpress(app);
}

module.exports = start;
