'use strict';

const debug = require('debug')('fun:local');

const _ = require('lodash');
const { green, red} = require('colors');

const { promptForSameFunction } = require('./init/prompt');

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

  if (!serviceRes || !serviceName) {

    throw new Error(`could not found service: ${serviceName}`);
  }

  let functionRes = serviceRes[functionName];

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


// Delete unmatched function objects
async function matchingFuntionUnderServiceBySourceName(sourceName, resources) {

  const obj = [];

  for (let { serviceName, serviceRes } of findServices(resources)) {

    if (serviceName === sourceName) {
      return {
        serviceName,
        serviceRes
      };
    } 
    for (let { functionName } of findFunctions(serviceRes)) {

      if (functionName !== sourceName) {

        serviceRes = _.omit(serviceRes, functionName);
      }
    }
    
    if (serviceRes[sourceName]) {

      obj.push({
        serviceName,
        serviceRes,
        functionName: sourceName
      });
    }
  }

  if (obj.length === 0) {

    throw new Error(`could not found sourceName: ${sourceName}`);  
  }

  if (obj.length > 1) {

    const choiseSourceName = await promptForSameFunction(obj);

    const array = _.split(choiseSourceName, '/');

    return findServiceByCertainServiceAndFunctionName(resources, _.first(array), _.last(array));
  }

  return {
    serviceName: _.first(obj).serviceName,
    serviceRes: _.first(obj).serviceRes
  };
}

function findServiceByCertainServiceAndFunctionName(resources, certainServiceName, certainFunctionName) {

  for (let { serviceName, serviceRes } of findServices(resources)) {

    if (serviceName === certainServiceName) {

      const funcsUnderService = findFunctions(serviceRes).map(funRes => {
        return funRes.functionName;
      });

      if (!_.includes(funcsUnderService, certainFunctionName)) {

        throw new Error(`could not found service/function：` + green(`${certainServiceName}`) + `/` + red(`${certainFunctionName}`));  
      }

      for (let { functionName } of findFunctions(serviceRes)) {

        if (functionName !== certainFunctionName) {

          serviceRes = _.omit(serviceRes, functionName);
        }
      }  
      return {
        serviceName,
        serviceRes
      };
    }
  }
  throw new Error(`could not found service: ${certainServiceName}`);  
}

module.exports = {
  findFunctionInTpl, findHttpTriggersInTpl,
  findFunctionsInTpl, findNasConfigInService,
  findHttpTriggersInFunction, findServices,
  findFunctions, findFirstFunction, matchingFuntionUnderServiceBySourceName,
  findServiceByCertainServiceAndFunctionName
};