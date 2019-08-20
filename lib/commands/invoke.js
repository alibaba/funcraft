'use strict';

const fs = require('fs');
const path = require('path');
const debug = require('debug')('fun:local');

const fc = require('../fc');
const { promptForInvokeFunctionSelection } = require('../init/prompt');

const readline = require('readline');
const getStdin = require('get-stdin');

const getVisitor = require('../visitor').getVisitor;

const _ = require('lodash');
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
      input
    });
    
    event = '';
    rl.on('line', (line) => {
      event += line;
    });
    rl.on('close', () => {
      getVisitor().then(visitor => {
        visitor.event({
          ec: 'invoke',
          ea: 'getEvent',
          el: 'success',
          dp: '/fun/invoke'
        }).send();
  
        resolve(event);
      });
    });
    
    rl.on('SIGINT', function () {
      
      getVisitor().then(visitor => {
        visitor.event({
          ec: 'invoke',
          ea: 'getEvent',
          el: 'cancel',
          dp: '/fun/invoke'
        }).send();
  
        // Keep the behavior consistent with system.
        reject(new Error('^C'));
      });
    });
  });
}

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

    return await getEvent('-');
  }

  if (options.eventFile) {

    const eventFile = options.eventFile;

    let filePath = path.isAbsolute(eventFile)? eventFile : path.join(process.cwd(), eventFile);

    return await getEvent(filePath);
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

  await fc.funInvokeFunction({serviceName, functionName, event, invocationType});
}

module.exports = invoke;
