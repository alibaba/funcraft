'use strict';

const fs = require('fs');
const path = require('path');
const debug = require('debug')('fun:local');

const validate = require('../../validate/validate');
const getStdin = require('get-stdin');
const func = require('../../function');
const definition = require('../../definition');
const { getDebugPort, getDebugIde } = require('../../debug');

const { detectTplPath, getTpl } = require('../../tpl');

const { red } = require('colors');

function parseInvokeName(invokeName) {
  let serviceName = null;
  let functionName = null;

  let index = invokeName.indexOf('/');

  if (index < 0) {
    functionName = invokeName;
  } else {
    serviceName = invokeName.substring(0, index);
    functionName = invokeName.substring(index + 1);
  }

  debug(`invoke service: ${serviceName}`);

  debug(`invoke function: ${functionName}`);

  return [serviceName, functionName];
}

async function localInvoke(invokeName, tpl, debugPort, event, debugIde, tplPath) {
  debug(`invokeName: ${invokeName}`);

  const [parsedServiceName, parsedFunctionName] = parseInvokeName(invokeName);

  debug(`parse service name ${parsedServiceName}, functionName ${parsedFunctionName}`);

  const [serviceName, serviceDefinition, functionName, functionDefinition] = definition.findFunctionInTpl(parsedServiceName, parsedFunctionName, tpl);

  debug(`found serviceName: ${serviceName}, functionName: ${functionName}, functionDefinition: ${functionDefinition}`);

  if (!functionDefinition) {
    console.error(red(`invokeName ${invokeName} is invalid`));
    process.exit(-1);
  }

  const nasConfig = definition.findNasConfigInService(serviceDefinition);

  await func.invokeFunction(serviceName, functionName, functionDefinition, debugPort, event, debugIde, null, null, null, nasConfig, tplPath);
}

async function getEventContent(options) {
  const eventFile = options.event;

  let event = await getStdin();

  if (event && eventFile) {
    console.error(red('-e or stdin only one can be provided'));
    process.exit(1);
  }

  if (eventFile) {
    event = fs.readFileSync(eventFile, 'utf8');
  }

  if (!event) {
    event = '{}';
  }

  debug('use event: ' + event);

  return event;
}

async function invoke(invokeName, options) {

  const tplPath = await detectTplPath();

  if (!tplPath) {
    console.error(red('Current folder not a fun project'));
    console.error(red('The folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
    process.exit(-1);
  } else if (path.basename(tplPath).startsWith('template')) {

    const { valid, ajv } = await validate(tplPath);

    if (!valid) {
      console.error(JSON.stringify(ajv.errors, null, 2));
      process.exit(-1);
    }

    const tpl = await getTpl(tplPath);


    const event = await getEventContent(options);

    debug('event content: ' + event);

    const debugPort = getDebugPort(options);

    const debugIde = getDebugIde(options);

    await localInvoke(invokeName, tpl, debugPort, event, debugIde, tplPath);
  } else {
    console.error(red('The template file name must be template.[yml|yaml].'));
    process.exit(-1);
  }
}

module.exports = invoke;
