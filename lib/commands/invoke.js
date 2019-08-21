'use strict';

const path = require('path');

const { detectTplPath, getTpl } = require('../tpl');

const fc = require('../fc');
const { promptForFunctionSelection } = require('../init/prompt');
const { parseInvokeName } = require('./local/invoke');

const { findFunctionInTpl, findFunctionsInTpl } = require('../definition');

const { getEvent } = require('../utils/file');

const _ = require('lodash');
const { red } = require('colors');

async function certainInvokeName(tpl, invokeName) {

  const [parsedServiceName, parsedFunctionName] = parseInvokeName(invokeName);

  if (!parsedServiceName && !parsedFunctionName) {

    throw new Error('unexpect parameter /');
  }

  if (!parsedServiceName) {

    const functions = findFunctionsInTpl(tpl, (functionName, functionRes) => {

      return functionName === parsedFunctionName;
    });

    if (functions.length === 0) {
      
      throw new Error(`don't exit function: ${parsedFunctionName}`);

    } else if (functions.length === 1) {
      
      return {
        serviceName: _.first(functions).serviceName,
        functionName: _.first(functions).functionName
      };
    } else {

      return await promptForFunctionSelection(functions);
    }
  }

  const {functionRes} = findFunctionInTpl(parsedServiceName, parsedFunctionName, tpl);

  if (!functionRes) {
    throw new Error(red(`function '${parsedFunctionName}' does not exist in service '${parsedServiceName}'.`));
  }

  return {
    serviceName: parsedServiceName,
    functionName: parsedFunctionName
  };
}

async function eventPriority(options) {

  if (options.eventStdin) {

    return await getEvent('-', 'fun invoke', '/fun/invoke');
  }

  if (options.eventFile) {

    const eventFile = options.eventFile;

    let filePath = path.isAbsolute(eventFile)? eventFile : path.join(process.cwd(), eventFile);

    return await getEvent(filePath, 'fun invoke', '/fun/invoke');
  }

  return options.event;
}

const invokeTypeSupport = ['Async', 'Sync', 'async', 'sync'];

const invokeTypeMapping = {
  'Async': 'Async',
  'async': 'Async',
  'Sync': 'Sync',
  'sync': 'Sync'
};

async function invoke(invokeName, options) {

  const tplPath = await detectTplPath();

  const tpl = await getTpl(tplPath);

  const { serviceName, functionName } = await certainInvokeName(tpl, invokeName);

  const invocationType = options.invocationType;

  if (!_.includes(invokeTypeSupport, invocationType)) {

    throw new Error(red(`error: unexpected argument：${invocationType}`));
  }

  const event = await eventPriority(options);

  await fc.invokeFunction({serviceName, functionName, event, invocationType: invokeTypeMapping[invocationType]});
}

module.exports = invoke;
