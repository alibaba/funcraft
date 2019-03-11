'use strict';

const fs = require('fs');
const path = require('path');
const debug = require('debug')('fun:local');

const validate = require('../../validate/validate');
const readline = require('readline');
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

  const {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl(parsedServiceName, parsedFunctionName, tpl);

  if (!functionRes) {
    console.error(red(`invokeName ${invokeName} is invalid`));
    process.exit(-1);
  }

  debug(`found serviceName: ${serviceName}, functionName: ${functionName}, functionRes: ${functionRes}`);

  // Lazy loading to avoid stdin being taken over twice.
  const LocalInvoke = require('../../local/local-invoke');
  const localInvoke = new LocalInvoke(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, tplPath);

  await localInvoke.invoke(event);
}

/**
 * Get event content from a file. It reads event from stdin if the file is "-".
 *
 * @param file the file from which to read the event content, or "-" to read from stdin.
 * @returns {Promise<String>}
 */
function getEvent(file) {
  return new Promise((resolve) => {
    let input;
    if (file === '-') {
      console.log(`Reading event data from stdin (you can also pass it from file with -e)`);
      input = process.stdin;
    } else {
      input = fs.createReadStream(file, {
        encoding: 'utf-8',
      });
    }
    const rl = readline.createInterface({
      input,
      output: process.stdout,
    });
    let event = '';
    rl.on('line', (line) => {
      event += line;
    });
    rl.on('close', () => {
      resolve(event);
    });
    rl.on('SIGINT', function () {
      // Keep the behavior consistent with system.
      process.stdout.write('^C');
      process.exit(-1);
    });
  });
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

    const event = await getEvent(options.event);

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
