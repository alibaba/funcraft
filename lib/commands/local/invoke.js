'use strict';

const fs = require('fs');
const path = require('path');
const debug = require('debug')('fun:local');

const validate = require('../../validate/validate');
const readline = require('readline');
const getStdin = require('get-stdin');
const definition = require('../../definition');
const deploySupport = require('../../deploy/deploy-support');
const { getDebugPort, getDebugIde } = require('../../debug');
const getVisitor = require('../../visitor').getVisitor;

const { detectTplPath, getTpl } = require('../../tpl');

const { red, yellow } = require('colors');

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

  if (!invokeName) {

    invokeName = definition.findFirstFunction(tpl);

    if (!invokeName) {
      throw new Error(red(`Missing function definition in template.yml`)); 
    }
    
    console.log(`\nMissing invokeName argument, Fun will use the first function ${yellow(invokeName)} as invokeName\n`);
  }

  const [parsedServiceName, parsedFunctionName] = parseInvokeName(invokeName);

  debug(`parse service name ${parsedServiceName}, functionName ${parsedFunctionName}`);

  const {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl(parsedServiceName, parsedFunctionName, tpl);

  if (!functionRes) {
    throw new Error(red(`invokeName ${invokeName} is invalid`));
  }
  const codeUri = functionRes.Properties.CodeUri;
  const runtime = functionRes.Properties.Runtime;
  await deploySupport.featureLibrary(codeUri, runtime, path.resolve(tplPath, '..'));

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
async function getEvent(eventFile) {
  let event = await getStdin(); // read from pipes
  if (event && eventFile) {
    throw new Error(red('-e or stdin only one can be provided'));
  }

  if (!eventFile) { return event; }

  return new Promise((resolve, reject) => {

    let input;

    if (eventFile === '-') { // read from stdin
      console.log(`Reading event data from stdin, which can be ended with Enter then Ctrl+D
  (you can also pass it from file with -e)`);
      input = process.stdin;
    } else {
      input = fs.createReadStream(eventFile, {
        encoding: 'utf-8'
      });
    }
    const rl = readline.createInterface({
      input,
      output: process.stdout
    });
    
    event = '';
    rl.on('line', (line) => {
      event += line;
    });
    rl.on('close', () => {
      getVisitor().then(visitor => {
        visitor.event({
          ec: 'local invoke',
          ea: 'getEvent',
          el: 'success',
          dp: '/fun/local/invoke'
        }).send();
  
        resolve(event);
      });
    });
    
    rl.on('SIGINT', function () {
      
      getVisitor().then(visitor => {
        visitor.event({
          ec: 'local invoke',
          ea: 'getEvent',
          el: 'cancel',
          dp: '/fun/local/invoke'
        }).send();
  
        // Keep the behavior consistent with system.
        reject(new Error('^C'));
      });
    });
  });
}

async function invoke(invokeName, options) {

  const tplPath = await detectTplPath();

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  } else if (path.basename(tplPath).startsWith('template')) {

    await validate(tplPath);

    const tpl = await getTpl(tplPath);

    const event = await getEvent(options.event);

    debug('event content: ' + event);

    const debugPort = getDebugPort(options);

    const debugIde = getDebugIde(options);

    await localInvoke(invokeName, tpl, debugPort, event, debugIde, tplPath);
  } else {
    throw new Error(red('The template file name must be template.[yml|yaml].'));
  }
}

module.exports = invoke;
