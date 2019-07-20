'use strict';

const { TEMPLATE_HEADER } = require('./constants');
const { getFcClient } = require('../client');
const {
  getTemplateFile,
  makeSurePathExists,
  getCodeUri,
  checkResource,
  outputTemplateFile,
  createProgressBar } = require('./utils');
const { parseServiceResource } = require('./service-parser');
const { parseFunctionResource } = require('./function-parser');
const { parseTriggerResource } = require('./trigger-parser');
const httpx = require('httpx');
const path = require('path');
const unzipper = require('unzipper');
const debug = require('debug')('fun:import:service');
const { green, grey } = require('colors');

async function getServiceMeta(serviceName) {
  const fc = await getFcClient();
  const { data } = await fc.getService(serviceName);
  return data;
}

async function getFunctionMetas(serviceName) {
  const fc = await getFcClient();
  const { data } = await fc.listFunctions(serviceName);
  return data.functions;
}

async function getTriggerMetas(serviceName, functionName) {
  const fc = await getFcClient();
  const { data } = await fc.listTriggers(serviceName, functionName);
  return data.triggers;
}

async function getFunctionResource(serviceName, functionMeta, fullOutputDir, recursive, onlyConfig) {
  const functionResource = parseFunctionResource(functionMeta);
  const functionName = functionMeta.functionName;
  if (!onlyConfig) {
    await outputFunctionCode(serviceName, functionName, fullOutputDir);
    functionResource.Properties.CodeUri = getCodeUri(serviceName, functionName);
  }

  if (recursive) {
    const triggerMetas = await getTriggerMetas(serviceName, functionName);
    if (triggerMetas && triggerMetas.length > 0) {
      functionResource.Events = {};
      for (const triggerMeta of triggerMetas) {
        debug('Trigger metadata: %s', triggerMeta);
        functionResource.Events[triggerMeta.triggerName] = parseTriggerResource(triggerMeta);
        console.log(`        ${green('✔')} ${triggerMeta.triggerName} - ${grey('Trigger')}`);
      }
    }
  }
  return functionResource;
}

async function outputFunctionCode(serviceName, functionName, fullOutputDir) {
  const fc = await getFcClient();
  const { data } = await fc.getFunctionCode(serviceName, functionName);
  const response = await httpx.request(data.url);
  var len = parseInt(response.headers['content-length'], 10);
  const bar = createProgressBar(`${green(':loading')} ${functionName} downloading :bar :rate/bps :percent :etas`, { total: len });
  response.on('data', (chunk) => {
    bar.tick(chunk.length);
  });
  response.on('end', () => {
    console.log(`    ${green('✔')} ${functionName} - ${grey('Function')}`);
  });
  const fullTargetCodeDir = path.join(fullOutputDir, serviceName, functionName);
  makeSurePathExists(fullTargetCodeDir);
  return new Promise((resolve, reject) => {
    response.pipe(unzipper.Extract({ path: fullTargetCodeDir })).on('error', reject).on('finish', resolve);
  });

}

async function getServiceResource(serviceName, fullOutputDir, recursive, onlyConfig, override) {
  const serviceMeta = await getServiceMeta(serviceName);
  debug('Service metadata: %s', serviceMeta);
  const serviceResource = parseServiceResource(serviceMeta);
  console.log(`${green('✔')} ${serviceName} - ${grey('Service')}`);

  if (recursive) {
    const functionMetas = await getFunctionMetas(serviceName);
    if (functionMetas && functionMetas.length > 0) {
      for (const functionMeta of functionMetas) {
        debug('Function metadata: %s', functionMeta);
        const functionName = functionMeta.functionName;
        const functionResource = await getFunctionResource(serviceName, functionMeta, fullOutputDir, recursive, onlyConfig);
        serviceResource[functionName] = functionResource;
      }
    }
  }
  return serviceResource;
}

async function importService(serviceName, outputDir = '.', recursive = true, onlyConfig = false) {
  console.log('\nImport service resources: ');
  const fullOutputDir = path.resolve(process.cwd(), outputDir);
  debug('Output Dir: %s', fullOutputDir);
  const templateFile = getTemplateFile(fullOutputDir);

  let content;
  let templateFilePath;

  if (templateFile) {
    content = templateFile.content;
    templateFilePath = templateFile.templateFilePath;
    checkResource(serviceName, content);
  } else {
    content = { ...TEMPLATE_HEADER };
    templateFilePath = path.resolve(fullOutputDir, 'template.yml');
  }

  const serviceResource = await getServiceResource(serviceName, fullOutputDir, recursive, onlyConfig);
  content.Resources[serviceName] = serviceResource;
  outputTemplateFile(templateFilePath, content);
  console.log('Service import finished\n')
}

module.exports = {
  getFunctionResource, outputFunctionCode, getServiceResource, importService
};
