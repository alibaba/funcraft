'use strict';

const debug = require('debug')('fun:local');

const SERVICE_RESOURCE = 'Aliyun::Serverless::Service';
const FUNCTION_RESOURCE = 'Aliyun::Serverless::Function';

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

  iterateResources(resources, SERVICE_RESOURCE, (serviceName, serviceRes) => {
    services.push({
      serviceName,
      serviceRes
    });
  });

  return services;
}

function findFunctions(serviceRes) {

  const functions = [];

  iterateResources(serviceRes, FUNCTION_RESOURCE, (functionName, functionRes) => {
    functions.push({
      functionName,
      functionRes
    });
  });

  return functions;
}

function findHttpTriggersInFunction(functionRes) {
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

  let serviceRes = resources[serviceName];
  let functionRes = null;

  if (serviceName) {
    functionRes = serviceRes[functionName];
  } else {
    throw new Error(`could not found service: ${serviceName}`);
  }

  if (functionRes && functionRes.Type !== FUNCTION_RESOURCE) {
    functionRes = null;
  }

  return {
    serviceName,
    serviceRes,
    functionName,
    functionRes
  };
}

function findFunctionInService(funcName, serviceRes) {

  debug('find function ' + funcName + ' definition in service: ' + JSON.stringify(serviceRes));

  for (let { functionName, functionRes } of findFunctions(serviceRes)) {
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
  for (let { serviceName, serviceRes } of findServices(resources)) {
    debug('servicename: ' + serviceName);
    const functionRes = findFunctionInService(functionName, serviceRes);

    if (functionRes) {
      return {
        serviceName,
        serviceRes,
        functionName,
        functionRes
      };
    }
  }

  return {};
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

function findFunctionsInTpl(tpl, filter) {
  const functions = [];

  const resources = tpl.Resources;

  for (let { serviceName, serviceRes } of findServices(resources)) {
    for (let { functionName, functionRes } of findFunctions(serviceRes)) {

      if (filter && !filter(functionName, functionRes)) { continue; }

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

function findNasConfigInService(serviceRes) {
  if (!serviceRes) { return null; }

  const serviceProps = serviceRes.Properties;

  if (!serviceProps) { return null; }

  return serviceProps.NasConfig;
}

function findHttpTriggersInTpl(tpl) {
  const resources = tpl.Resources;

  const httpTriggers = [];

  for (let { serviceName, serviceRes } of findServices(resources)) {
    for (let { functionName, functionRes } of findFunctions(serviceRes)) {
      for (let { triggerName, triggerRes } of findHttpTriggersInFunction(functionRes)) {
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

function findFirstFunction(tpl) {
  var firstInvokeName;
  const resources = tpl.Resources;
  for (let { serviceName, serviceRes } of findServices(resources)) {
    for (let { functionName } of findFunctions(serviceRes)) {
      firstInvokeName = serviceName + '/' + functionName;
      break;
    }
  }
  return firstInvokeName;
}

module.exports = {
  findFunctionInTpl, findHttpTriggersInTpl,
  findFunctionsInTpl, findNasConfigInService,
  findHttpTriggersInFunction, findServices,
  findFunctions, findFirstFunction
};