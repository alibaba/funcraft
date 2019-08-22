'use strict';

const path = require('path');

const { detectTplPath, getTpl } = require('../tpl');

const fc = require('../fc');
const { promptForFunctionSelection } = require('../init/prompt');
const { parseInvokeName } = require('./local/invoke');

const { findFunctionsInTpl } = require('../definition');

const { getEvent } = require('../utils/file');

const validate = require('../../lib/commands/validate');

const _ = require('lodash');
const { red } = require('colors');

const invokeTypeSupport = ['async', 'sync'];



async function findFunctionInCurrentDirectory(invokeFunctionName) {

  const tplPath = await detectTplPath();

  if (!tplPath) {

    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  await validate(tplPath);

  const tpl = await getTpl(tplPath);

  const functions = findFunctionsInTpl(tpl, (functionName, functionRes) => {

    return functionName === invokeFunctionName;
  });

  if (functions.length === 0) {
    
    throw new Error(`don't exit function: ${invokeFunctionName}`);

  } else if (functions.length === 1) {
    
    return {
      serviceName: _.first(functions).serviceName,
      functionName: _.first(functions).functionName
    };
  } else {

    return await promptForFunctionSelection(functions);
  }
}


async function certainInvokeName(invokeName) {

  const [parsedServiceName, parsedFunctionName] = parseInvokeName(invokeName);

  if (!parsedFunctionName) {

    throw new Error(`invalid invokeName '${invokeName}'.`);
  }

  if (!parsedServiceName) {

    return await findFunctionInCurrentDirectory(parsedFunctionName);
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

    return await getEvent(path.resolve(options.eventFile), 'fun invoke', '/fun/invoke');
  }

  return options.event;
}

async function invoke(invokeName, options) {

  const { serviceName, functionName } = await certainInvokeName(invokeName);

  const invocationType = options.invocationType;

  const upperCase = _.lowerCase(invocationType);

  if (!_.includes(invokeTypeSupport, upperCase)) {

    throw new Error(red(`error: unexpected argument：${invocationType}`));
  }

  const event = await eventPriority(options);

  await fc.invokeFunction({serviceName, functionName, event, invocationType: _.upperFirst(upperCase)});
}

module.exports = invoke;
