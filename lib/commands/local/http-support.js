'use strict';

const fc = require('../../fc');
const debug = require('debug')('fun:local');
const HttpInvoke = require('../../local/http-invoke');
const ApiInvoke = require('../../local/api-invoke');

const { setCORSHeaders } = require('../../cors');
const { green, yellow } = require('colors');

function printHttpTriggerTips(serverPort, serviceName, functionName, triggerName, endpoint, httpMethods, authType, domainName) {
  const prefix = domainName ? `CustomDomain ${domainName}` : `HttpTrigger ${triggerName}`;
  console.log(green(`${prefix} of ${serviceName}/${functionName} was registered`));
  console.log('\turl: ' + yellow(`http://localhost:${serverPort}${endpoint}`));
  console.log(`\tmethods: ` + yellow(httpMethods));
  console.log(`\tauthType: ` + yellow(authType));
}

async function registerHttpTriggers(app, router, serverPort, httpTriggers, debugPort, debugIde, baseDir, debuggerPath, debugArgs, nasBaseDir) {
  for (let httpTrigger of httpTriggers) {
    await registerSingleHttpTrigger(app, router, serverPort, httpTrigger, debugPort, debugIde, baseDir, false, debuggerPath, debugArgs, nasBaseDir);
  }
  console.log();
}

async function registerSingleHttpTrigger(app, router, serverPort, httpTrigger, debugPort, debugIde, baseDir, eager = false, debuggerPath, debugArgs, nasBaseDir) {
  const { serviceName, serviceRes,
    functionName, functionRes,
    triggerName, triggerRes, path, domainName } = httpTrigger;

  debug('serviceName: ' + serviceName);
  debug('functionName: ' + functionName);
  debug('tiggerName: ' + triggerName);
  debug('triggerRes: ' + triggerRes);
  debug('path: ' + path);

  const isCustomDomain = path;

  const httpTriggerPrefix = `/2016-08-15/proxy/${serviceName}/${functionName}`;
  const customDomainPrefix = path;

  const endpointForDisplay = isCustomDomain ? customDomainPrefix : httpTriggerPrefix;
  const endpointForRoute = isCustomDomain ? endpointForDisplay : `${endpointForDisplay}*`;
  const endpointPrefix = isCustomDomain ? '' : httpTriggerPrefix;

  const triggerProps = triggerRes.Properties;
  const httpMethods = triggerProps.Methods;
  const authType = triggerProps.AuthType;

  const codeUri = functionRes.Properties.CodeUri;
  const runtime = functionRes.Properties.Runtime;

  debug('debug port: %d', debugPort);

  await fc.detectLibrary(codeUri, runtime, baseDir, functionName);
  const httpInvoke = new HttpInvoke(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, authType, endpointPrefix, debuggerPath, debugArgs, nasBaseDir);
  if (eager) {
    await httpInvoke.initAndStartRunner();
  }

  app.use(setCORSHeaders);
  app.use(router);

  for (let method of httpMethods) {
    router[method.toLowerCase()](endpointForRoute, async (req, res) => {
      if (req.get('Upgrade') === 'websocket') {
        res.status(403).send('websocket not support');
        return;
      }
      await httpInvoke.invoke(req, res);
    });
  }
  printHttpTriggerTips(serverPort, serviceName, functionName, triggerName, endpointForDisplay, httpMethods, authType, domainName);
}

function logsApi(serverPort, serviceName, functionName, endpoint) {
  console.log(green(`API ${serviceName}/${functionName} was registered`));
  console.log('\turl: ' + yellow(`http://localhost:${serverPort}${endpoint}/`));
}

async function registerApis(app, serverPort, functions, debugPort, debugIde, baseDir, debuggerPath, debugArgs, nasBaseDir) {
  for (let { serviceName, serviceRes,
    functionName, functionRes } of functions) {

    const endpoint = `/2016-08-15/services/${serviceName}/functions/${functionName}/invocations`;

    const apiInvoke = new ApiInvoke(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, debuggerPath, debugArgs, nasBaseDir);

    const codeUri = functionRes.Properties.CodeUri;
    const runtime = functionRes.Properties.Runtime;
    await fc.detectLibrary(codeUri, runtime, baseDir, functionName);

    app.post(endpoint, async (req, res) => {
      apiInvoke.invoke(req, res);
    });

    logsApi(serverPort, serviceName, functionName, endpoint);
  }

  console.log();
}

module.exports = {
  registerHttpTriggers, registerApis,
  registerSingleHttpTrigger
};
