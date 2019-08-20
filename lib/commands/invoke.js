'use strict';

const path = require('path');

const fc = require('../fc');
const { promptForInvokeFunctionSelection } = require('../init/prompt');
const { parseInvokeName } = require('./local/invoke');

const { getEvent } = require('../utils/file');

const _ = require('lodash');
const { red } = require('colors');

async function certainInvokeName(invokeName) {

  const [parsedServiceName, parsedFunctionName] = parseInvokeName(invokeName);

  if (!parsedServiceName && !parsedFunctionName) {

    throw new Error('unexpect parameter /');
  }

  if (!parsedServiceName) {

    const functions = await fc.getFunctionsByFunctionName(parsedFunctionName);

    if (functions.length === 0) {
      
      throw new Error(`don't exit function: ${parsedFunctionName}`);

    } else if (functions.length === 1) {
      
      return {
        serviceName: _.first(functions).serviceName,
        functionName: _.first(functions).functionName
      };
    } else {

      return await promptForInvokeFunctionSelection(functions);
    }
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

async function invoke(invokeName, options) {

  const invocationType = options.invocationType;
  if (!_.includes(['Async', 'Sync'], invocationType)) {

    throw new Error(red(`error: unexpected argument：${invocationType}`));
  }

  const { serviceName, functionName } = await certainInvokeName(invokeName);

  const event = await eventPriority(options);

  await fc.invokeFunction({serviceName, functionName, event, invocationType});
}

module.exports = invoke;
