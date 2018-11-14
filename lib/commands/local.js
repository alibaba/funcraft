'use strict';

const fs = require('fs');
const path = require('path');
const debug = require('debug')('fun:local');

const validate = require('../validate/validate');
const getStdin = require('get-stdin');
const docker = require('../docker');
const definition = require('../definition');

const { detectTplPath, getTpl } = require('../tpl');

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

async function localInvoke(invokeName, tpl, debugPort, event) {
  debug(`invokeName: ${invokeName}`);

  const [parsedServiceName, parsedFunctionName] = parseInvokeName(invokeName);

  debug(`parse service name ${parsedServiceName}, functionName ${parsedFunctionName}`);

  const [serviceName, functionName, functionDefinition] = definition.findFunctionInTpl(parsedServiceName, parsedFunctionName, tpl);

  debug(`found serviceName: ${serviceName}, functionName: ${functionName}, functionDefinition: ${functionDefinition}`);

  if (!functionDefinition) {
    console.error(red(`invokeName ${invokeName} is invalid`));
    process.exit(-1);
  }

  await docker.invokeFunction(serviceName, functionName, functionDefinition, debugPort, event);
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

async function local(invokeName, options) {

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

    let debugPort = options.debugPort;

    const event = await getEventContent(options);

    debug('event content: ' + event);

    if (debugPort) {
      debugPort = parseInt(debugPort);

      if (Number.isNaN(debugPort)) {
        throw Error(red('debugPort must be number'));
      }
    }

    debug(`debugPort: ${debugPort}`);

    await localInvoke(invokeName, tpl, debugPort, event);
  } else {
    console.error(red('The template file name must be template.[yml|yaml].'));
    process.exit(-1);
  }
}

module.exports = local;
