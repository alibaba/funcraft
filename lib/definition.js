'use strict';

const debug = require('debug')('fun:local');

/* eslint-disable */
function iterateResources(resources, resType, callback) {
  for (const [name, res] of Object.entries(resources)) {
    if (res.Type === resType) {
      callback(name, res);
    }
  }
}
/* eslint-enable */

function findServices(resources) {
  const services = [];

  iterateResources(resources, 'Aliyun::Serverless::Service', (serviceName, serviceRes) => {
    services.push({
      serviceName, 
      serviceRes
    });
  });
  
  return services;
}

function findFunctions(serviceRes) {

  const functions = [];

  iterateResources(serviceRes, 'Aliyun::Serverless::Function', (functionName, functionRes) => {
    functions.push({
      functionName, 
      functionRes
    });
  });

  return functions;
}

function findHttpTriggers(functionRes) {
  const triggers = [];


  if (functionRes.Events) {
    iterateResources(functionRes.Events, 'HTTP', (triggerName, triggerRes) => {
      triggers.push({
        triggerName, 
        triggerRes
      });
    });
  }

  return triggers;
}

function findFunctionByServiceAndFunctionName(resources, serviceName, functionName) {
  debug('begin search serviceName and functionName');

  let serviceDefinition = resources[serviceName];
  let functionDefinition = null;

  if (serviceName) {
    functionDefinition = serviceDefinition[functionName];
  } else {
    console.error(`could not found service: ${serviceName}`);
    process.exit(-1);
  }

  if (functionDefinition && functionDefinition.Type !== 'Aliyun::Serverless::Function') {
    functionDefinition = null;
  }

  return [serviceName, functionName, functionDefinition];
}

function findFunctionInService(funcName, serviceRes) {

  debug('find function ' + funcName + ' definition in service: ' + JSON.stringify(serviceRes));
  
  for (let {functionName, functionRes} of findFunctions(serviceRes)) {
    debug(`functionName is ${functionName}, compare with ${functionName}`);
    if (functionName === funcName) {
      debug(`found function ${functionName}, functionRes is ${functionRes}`);

      return functionRes;
    }
  }

  return null;
}

function findFunctionByFunctionName(resources, functionName) {
  // iterator all services and functions
  for (let {serviceName, serviceRes} of findServices(resources)) {
    debug('servicename: ' + serviceName);
    const functionDefinition = findFunctionInService(functionName, serviceRes);

    if (functionDefinition) { return [serviceName, functionName, functionDefinition]; }
  }

  return [null, null, null];
}

// return first if only provide functionName
function findFunctionInTpl(serviceName, functionName, tpl) {

  const resources = tpl.Resources;

  if (serviceName) {
    // invokeName is serviceName/functionName
    return findFunctionByServiceAndFunctionName(resources, serviceName, functionName);
  }
  //  invokeName is functionName
  return findFunctionByFunctionName(resources, functionName);
}

function findFunctionsInTpl(tpl) {
  const functions = [];

  const resources = tpl.Resources;

  for (let {serviceName, serviceRes} of findServices(resources)) {
    for (let {functionName, functionRes} of findFunctions(serviceRes)) {
      functions.push({
        serviceName, 
        serviceRes,
        functionName, 
        functionRes
      });    
    }
  }
  
  return functions;
}

function findHttpTriggersInTpl(tpl) {
  const resources = tpl.Resources;
  
  const httpTriggers = [];

  for (let {serviceName, serviceRes} of findServices(resources)) {
    for (let {functionName, functionRes} of findFunctions(serviceRes)) {
      for (let {triggerName, triggerRes} of findHttpTriggers(functionRes)) {
        httpTriggers.push({
          serviceName,
          serviceRes,
          functionName,
          functionRes,
          triggerName,
          triggerRes
        });
      }
    }
  }

  return httpTriggers;
}

module.exports = {
  findFunctionInTpl, findHttpTriggersInTpl, findFunctionsInTpl
};