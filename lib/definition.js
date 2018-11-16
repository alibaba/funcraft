'use strict';

const debug = require('debug')('fun:local');

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

function findFunctionInServiceProps(functionName, serviceProps) {

  debug('find function ' + functionName + ' definition in service: ' + JSON.stringify(serviceProps));

  for (const [name, resource] of Object.entries(serviceProps)) {

    if (resource.Type === 'Aliyun::Serverless::Function') {
      if (name === functionName) {
        return resource;
      }
    }
  }

  return null;
}

function findFunctionByFunctionName(resources, functionName) {
  // iterator all services and functions
  for (const [serviceName, resource] of Object.entries(resources)) {

    debug('name: ' + serviceName);
    if (resource.Type === 'Aliyun::Serverless::Service') {
      debug('servicename: ' + serviceName);
      const functionDefinition = findFunctionInServiceProps(functionName, resource);

      if (functionDefinition) { return [serviceName, functionName, functionDefinition]; }
    }
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

module.exports = {
  findFunctionInTpl  
};