'use strict';

var express = require('express');
var app = express();

const _ = require('lodash');
const path = require('path');
const definition = require('../../definition');
const httpSupport = require('./http-support');
const EventStart = require('../../local/event-start');

const { ensureTmpDir } = require('../../utils/path');
const { ensureFilesModified } = require('../../utils/file');
const { showLocalStartNextTips } = require('../../../lib/build/tips');
const { promptForDebugaHttptriggers } = require('../../../lib/init/prompt');
const { getDebugPort, getDebugIde } = require('../../debug');
const { generateMergedTpl, detectNasBaseDir } = require('../../tpl');

const serverPort = 8000;
const SERVER_CLOSE_TIMEOUT = 3000;

function registerSigintForExpress(server) {
  var sockets = {}, nextSocketId = 0;

  // close express server
  // https://stackoverflow.com/questions/14626636/how-do-i-shutdown-a-node-js-https-server-immediately/14636625#14636625
  server.on('connection', function (socket) {
    let socketId = nextSocketId++;
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

function getRoutesByDomainPath(tpl, domainName, routePath) {
  for (const [name, resource] of Object.entries(tpl.Resources)) {
    if (name === domainName && resource.Type === 'Aliyun::Serverless::CustomDomain') {
      const properties = (resource.Properties || {});
      const tplRouteConfig = properties.RouteConfig.Routes || properties.RouteConfig.routes;
      return getRoutesByRoutePath(tplRouteConfig, routePath, domainName);
    }
  }
  return [];
}

function getRoutesByRoutePath(tplRouteConfig, routePath, domainName) {
  if (routePath && !_.includes(Object.keys(tplRouteConfig), routePath)) {
    throw new Error(`can't find ${routePath} in Routes definition`);
  }
  const routes = [];

  for (const [path, func] of Object.entries(tplRouteConfig)) {
    routes.push({
      domainName,
      path,
      serviceName: func.ServiceName || func.serviceName,
      functionName: func.FunctionName || func.functionName
    });
  }
  return routePath ? routes.filter(f => { return f.path === routePath; }) : routes;
}

function assertRoutesAreHttpTriggers(routes, httpTriggers) {
  if (!_.isEmpty(routes)) {
    const serviceNames = httpTriggers.map(h => h.serviceName);
    const functionNames = httpTriggers.map(h => h.functionName);
    for (const route of routes) {
      if (!_.includes(serviceNames, route.serviceName) || !_.includes(functionNames, route.functionName)) {
        throw new Error(`can't find ${route.serviceName}/${route.functionName} in template.yml or function ${route.serviceName}/${route.functionName} is not http trigger.`);
      }
    }
  }
}

function addRoutesInfoToHttpTriggers(httpTriggers, routes) {
  return routes.reduce((acc, cur) => {
    for (const httpTrigger of httpTriggers) {
      const httpTriggerWithRoute = addRoutesInfoToHttpTrigger(httpTrigger, cur);
      if (!_.isEmpty(httpTriggerWithRoute)) {
        acc.push(httpTriggerWithRoute);
      }
    }
    return acc;
  }, []);
}

// add path property to httpTrigger
function addRoutesInfoToHttpTrigger(httpTrigger, route) {
  const replace = Object.assign({}, httpTrigger);
  if (route.serviceName === replace.serviceName && route.functionName === replace.functionName ) {
    replace.path = route.path;
    replace.domainName = route.domainName;
    return replace;
  }
  return null;
}

async function registerApis(tpl, app, serverPort, debugPort, debugIde, baseDir, debuggerPath, debugArgs, nasBaseDir, tplPath) {
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

  await httpSupport.registerApis(app, serverPort, functions, debugPort, debugIde, baseDir, debuggerPath, debugArgs, nasBaseDir, tplPath);
}

function showTipsWithDomainIfNecessary(tpl, domainName) {
  const customDomains = _.pickBy(tpl.Resources, (resource, key) => { return resource.Type === 'Aliyun::Serverless::CustomDomain'; });
  if (!domainName && !_.isEmpty(customDomains)) {
    showLocalStartNextTips(Object.keys(customDomains));
  }
}

async function start(options, invokeName = '') {
  const { tpl, tplPath } = await generateMergedTpl(options.template);

  const nasBaseDir = detectNasBaseDir(tplPath);

  const debugPort = getDebugPort(options);
  const debugIde = getDebugIde(options);
  const debuggerPath = options.debuggerPath;
  const debugArgs = options.debugArgs;
  const baseDir = path.dirname(tplPath);

  await ensureFilesModified(tplPath);

  let httpTriggers = definition.findHttpTriggersInTpl(tpl);

  const [domainName, routePath] = definition.parseDomainRoutePath(invokeName);
  const routes = getRoutesByDomainPath(tpl, domainName, routePath);
  assertRoutesAreHttpTriggers(routes, httpTriggers);

  const router = express.Router({
    strict: true
  });

  if (!_.isEmpty(routes)) {
    httpTriggers = addRoutesInfoToHttpTriggers(httpTriggers, routes);
  } else {
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
        if (!functionRes) { throw new Error(`Error: function ${invokeName} not found in ${tplPath}`); }

        const tmpDir = await ensureTmpDir(null, tplPath, serviceName, functionName);

        const eventStart = new EventStart(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir, null, null, nasBaseDir);
        await eventStart.init();
        return;
      }
      if (httpTrigger.length > 1) {
        throw new Error(`${invokeName} is not unique`);
      }

      await httpSupport.registerSingleHttpTrigger(app, router, serverPort, httpTrigger[0], debugPort, debugIde, baseDir, true, debuggerPath, debugArgs, nasBaseDir, tplPath);
      startExpress(app);
      return;
    }
  }

  if (debugPort) {
    let debugFunction;

    if (httpTriggers.length > 1) {
      const { path, serviceName, functionName } = await promptForDebugaHttptriggers(httpTriggers);

      debugFunction = httpTriggers.filter(f => {
        return f.serviceName === serviceName && f.functionName === functionName && f.path === path;
      });
    } else if (httpTriggers.length === 1) {
      debugFunction = httpTriggers;
    }

    await httpSupport.registerSingleHttpTrigger(app, router, serverPort, debugFunction[0], debugPort, debugIde, baseDir, true, debuggerPath, debugArgs, nasBaseDir, tplPath);
  } else {
    await httpSupport.registerHttpTriggers(app, router, serverPort, httpTriggers, debugPort, debugIde, baseDir, debuggerPath, debugArgs, nasBaseDir, tplPath);
  }

  if (_.isEmpty(routes)) { await registerApis(tpl, app, serverPort, debugPort, debugIde, baseDir, debuggerPath, debugArgs, nasBaseDir, tplPath); }

  startExpress(app);
  showTipsWithDomainIfNecessary(tpl, domainName);
}

module.exports = start;