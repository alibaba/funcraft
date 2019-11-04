'use strict';

const debug = require('debug')('fun:common');

const _ = require('lodash');
const { green, red } = require('colors');

const { promptForFunctionSelection } = require('./init/prompt');

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


function iterateFunctions(tplContent, callback) {
  if (tplContent.Resources) {
    const resources = tplContent.Resources;
    
    iterateResources(resources, SERVICE_RESOURCE, (serviceName, serviceRes) => {
      iterateResources(serviceRes, FUNCTION_RESOURCE, (functionName, functionRes) => {
        callback(
          serviceName,
          serviceRes,
          functionName,
          functionRes
        );
      });
    });
  }
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

  if (!serviceRes || !serviceName || serviceRes.Type !== SERVICE_RESOURCE) {

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

function parseDomainRoutePath(domainRoutePath) {
  let domainName = null;
  let routePath = null;

  if (!domainRoutePath) { return []; }

  const index = domainRoutePath.indexOf('/');
  if (index < 0) {
    domainName = domainRoutePath;
  } else {
    domainName = domainRoutePath.substring(0, index);
    routePath = domainRoutePath.substring(index);
  }
  return [domainName, routePath];
}

function parseFunctionPath(funcPath) {
  let serviceName = null;
  let functionName = null;

  if (!funcPath) { return []; }

  const index = funcPath.indexOf('/');
  if (index < 0) {
    functionName = funcPath;
  } else {
    serviceName = funcPath.substring(0, index);
    functionName = funcPath.substring(index + 1);
  }
  debug(`invoke service: ${serviceName}`);
  debug(`invoke function: ${functionName}`);
  return [serviceName, functionName];
}

/**
 * funcPath : functionName or serviceName/functionName
 */
function findFunctionInTpl(funcPath, tpl) {
  const [serviceName, functionName] = parseFunctionPath(funcPath);
  return doFindFunctionInTpl(serviceName, functionName, tpl);
}

// return first if only provide functionName
function doFindFunctionInTpl(serviceName, functionName, tpl) {

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

function findFirstFunctionName(tpl) {
  const resources = tpl.Resources;

  var firstInvokeName;

  for (let { serviceName, serviceRes } of findServices(resources)) {
    for (let { functionName } of findFunctions(serviceRes)) {
      firstInvokeName = serviceName + '/' + functionName;
      break;
    }
  }

  if (!firstInvokeName) {
    throw new Error(red(`Missing function definition in template.yml`)); 
  }
  return firstInvokeName;
}

// find the first service in resoueces
function findServiceByServiceName (resources, name) {

  for (let { serviceName, serviceRes } of findServices(resources)) {

    if (serviceName === name) {
      return {
        serviceName,
        serviceRes
      };
    }
  }
  return {};
}

function findAllFunctionsByFunctionName(resources, functionName) {

  let functions = [];

  for (let { serviceName, serviceRes } of findServices(resources)) {
    debug('servicename: ' + serviceName);
    const functionRes = findFunctionInService(functionName, serviceRes);

    if (functionRes) {

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

async function matchingFuntionUnderServiceBySourceName(resources, sourceName) {

  const serviceObj = findServiceByServiceName(resources, sourceName);

  if (!_.isEmpty(serviceObj)) {

    return {
      serviceName: serviceObj.serviceName,
      serviceRes: serviceObj.serviceRes
    };
  }

  const functions = findAllFunctionsByFunctionName(resources, sourceName);

  if (functions.length === 0) {

    throw new Error(`could not found sourceName: ${sourceName}`);  

  } else if (functions.length > 1) {

    const { serviceName, functionName } = await promptForFunctionSelection(functions);

    const selectionFunction = functions.find(funcObj => {

      return funcObj.serviceName === serviceName && funcObj.functionName === functionName;
    });

    // delete unmatch functions under a serviceRes
    const serviceRes = deleteUnmatchFunctionsUnderServiceRes(selectionFunction);

    return {
      serviceName: selectionFunction.serviceName,
      serviceRes
    };
  }

  const serviceName = _.first(functions).serviceName;
  let serviceRes = _.first(functions).serviceRes;
  
  serviceRes = deleteUnmatchFunctionsUnderServiceRes({
    serviceName,
    serviceRes,
    functionName: sourceName
  });

  return {
    serviceName,
    serviceRes
  };
}

// delete unmatch functions under a serviceRes
function deleteUnmatchFunctionsUnderServiceRes({
  serviceName,
  serviceRes,
  functionName
}) {

  const functionNamesInService = findFunctions(serviceRes).map(funRes => {
    return funRes.functionName;
  });

  if (!_.includes(functionNamesInService, functionName)) {

    throw new Error(`could not found service/function：` + green(`${serviceName}`) + `/` + red(`${functionName}`));
  }

  for (let functions of findFunctions(serviceRes)) {

    if (functions.functionName !== functionName) {

      serviceRes = _.omit(serviceRes, functions.functionName);
    }
  } 

  return serviceRes;
}

function findServiceByCertainServiceAndFunctionName(resources, certainServiceName, certainFunctionName) {

  for (let { serviceName, serviceRes } of findServices(resources)) {

    if (serviceName === certainServiceName) {

      serviceRes = deleteUnmatchFunctionsUnderServiceRes({
        serviceName,
        serviceRes,
        functionName: certainFunctionName
      });

      return {
        serviceName,
        serviceRes
      };
    }
  }

  throw new Error(`could not found service: ${certainServiceName}`);
}

function isNasAutoConfig(nasConfig) {
  if (nasConfig === 'Auto') { return true; }
  return false;
}

function isVpcAutoConfig(vpcConfig) {
  if (vpcConfig === 'Auto') { return true; }
  return false;
}

module.exports = {
  findFunctionInTpl, findHttpTriggersInTpl,
  findFunctionsInTpl, findNasConfigInService,
  findHttpTriggersInFunction, findServices,
  findFunctions, findFirstFunctionName, matchingFuntionUnderServiceBySourceName,
  findServiceByCertainServiceAndFunctionName, deleteUnmatchFunctionsUnderServiceRes,
  isNasAutoConfig, isVpcAutoConfig, parseFunctionPath, iterateFunctions, parseDomainRoutePath
};