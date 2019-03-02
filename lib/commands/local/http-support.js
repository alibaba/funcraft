'use strict';


const debug = require('debug')('fun:local');

const { green, yellow } = require('colors');

const HttpInvoke = require('../../local/http-invoke');
const ApiInvoke = require('../../local/api-invoke');

function logsHttpTrigger(serverPort, serviceName, functionName, triggerName, endpoint, httpMethods, authType) {
  console.log(green(`http trigger ${triggerName} of ${serviceName}/${functionName} was registered`));
  console.log('\turl: ' + yellow(`http://localhost:${serverPort}${endpoint}/`));
  console.log(`\tmethods: ` + yellow(httpMethods));
  console.log(`\tauthType: ` + yellow(authType));
}

async function registerHttpTriggers(app, serverPort, httpTriggers, debugPort, debugIde, tplPath) {
  for (let { serviceName, serviceRes,
    functionName, functionRes,
    triggerName, triggerRes } of httpTriggers) {

    debug('serviceName: ' + serviceName);
    debug('functionName: ' + functionName);
    debug('tiggerName: ' + triggerName);
    debug('triggerRes: ' + triggerRes);

    const endpointPrefix = `/2016-08-15/proxy/${serviceName}/${functionName}`;
    const endpoint = `${endpointPrefix}*`;

    const triggerProps = triggerRes.Properties;
    const httpMethods = triggerProps.Methods;
    const authType = triggerProps.AuthType;

    debug('debug port: %d', debugPort);

    const httpInvoke = new HttpInvoke(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, tplPath, authType, endpointPrefix);

    for (let method of httpMethods) {

      app[method.toLowerCase()](endpoint, async (req, res) => {

        await httpInvoke.invoke(req, res);
      });
    }

    logsHttpTrigger(serverPort, serviceName, functionName, triggerName, endpointPrefix, httpMethods, authType);
  }

  console.log();
}

function logsApi(serverPort, serviceName, functionName, endpoint) {
  console.log(green(`api ${serviceName}/${functionName} was registered`));
  console.log('\turl: ' + yellow(`http://localhost:${serverPort}${endpoint}/`));
}

function registerApis(app, serverPort, functions, debugPort, debugIde, tplPath) {
  for (let { serviceName, serviceRes,
    functionName, functionRes } of functions) {

    const endpoint = `/2016-08-15/services/${serviceName}/functions/${functionName}/invocations`;

    const apiInvoke = new ApiInvoke(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, tplPath);

    app.post(endpoint, async (req, res) => {
      apiInvoke.invoke(req, res);
    });

    logsApi(serverPort, serviceName, functionName, endpoint);
  }

  console.log();
}

module.exports = {
  registerHttpTriggers, registerApis
};