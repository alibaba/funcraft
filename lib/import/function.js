'use strict';

const { getFcClient } = require('../client');
const { TEMPLATE_HEADER, SERVICE_TYPE } = require('./constants');
const { getTemplateFile, checkResource, outputTemplateFile } = require('./utils');
const { getFunctionResource, getServiceResource } = require('./service');
const path = require('path');
const debug = require('debug')('fun:import:function');
const { green, red } = require('colors');

async function getFuncitonMeta(serviceName, functionName) {
  const fc = await getFcClient();
  const { data } = await fc.getFunction(serviceName, functionName);
  return data;
}

function existsService(serviceName, content) {
  if (!content.Resources) {
    throw new Error(red('The template file format in the current directory is incorrect.'));
  }
  const service = content.Resources[serviceName];
  if (service && service.Type === SERVICE_TYPE) {
    if (service.Type === SERVICE_TYPE) {
      return true;
    }
    throw new Error(red(`The resource that needs to be imported already exists: ${serviceName}, type: ${service.Type}.`));
  }
  return false;
}

function checkFunction(serviceName, functionName, content) {
  const service = content.Resources[serviceName];
  if (service[functionName]) {
    throw new Error(red(`The resource that needs to be imported already exists: ${serviceName}/${functionName}.`));
  }
}

async function importFunction(serviceName, functionName, outputDir = '.', recursive = true, onlyConfig = false) {
  console.log('\nImport function resources:');
  const fullOutputDir = path.resolve(process.cwd(), outputDir);
  debug('Output Dir: %s', fullOutputDir);
  const templateFile = getTemplateFile(fullOutputDir);
  const functionMeta = await getFuncitonMeta(serviceName, functionName);
  debug('Function metadata: %s', functionMeta);

  let content;
  let serviceResource;
  let templateFilePath;

  serviceResource = await getServiceResource(serviceName, fullOutputDir, false, onlyConfig);

  if (templateFile) {
    content = templateFile.content;
    templateFilePath = templateFile.templateFilePath;

    if (existsService(serviceName, content)) {
      checkFunction(serviceName, functionName, content);
      content.Resources[serviceName] = { ...content.Resources[serviceName], serviceResource };
      serviceResource = content.Resources[serviceName];
    } else {
      checkResource();
    }
  } else {
    content = { ...TEMPLATE_HEADER };
    templateFilePath = path.resolve(fullOutputDir, 'template.yml');
  }

  const functionResource = await getFunctionResource(serviceName, functionMeta, fullOutputDir, recursive, onlyConfig);
  serviceResource[functionName] = functionResource;
  content.Resources[serviceName] = serviceResource;
  outputTemplateFile(templateFilePath, content);
  console.log('Function import finished\n');
}

module.exports = {
  importFunction
};
