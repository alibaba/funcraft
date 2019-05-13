'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const debug = require('debug')('edge:invoke');

const validate = require('../../validate/validate');
const LocalRunner = require('../../edge/runner');
const LocalRuntime = require('../../edge/runtime');
const FunctionIdentifier = require('../../function-identifier');
const { detectTplPath, getTpl } = require('../../tpl');
const { getProfile } = require('../../profile');

async function invoke(name, options) {

  // Convert name string to FunctionId.
  const identifier = new FunctionIdentifier(name);

  const templateFile = await detectTplPath();
  if (!templateFile || !path.basename(templateFile).startsWith('template')) {
    throw new Error(`Error: Can't find template file at ${templateFile}.`);
  }
  console.log(`Using template file at ${templateFile}.`);
  
  await validate(templateFile);

  const template = await getTpl(templateFile);

  const cwd = path.dirname(templateFile);
  debug(`Current working directory: ${cwd}`);

  const event = await getEvent(options.event);
  debug(`Got event ${event}`);

  const profile = await getProfile();
  debug(`Found profile: ${JSON.stringify(profile)}`);

  const runtime = new LocalRuntime();
  const localRunner = new LocalRunner({
    cwd,
    runtime,
    template,
    profile,
    debugInfo: {
      debugPort: options.debugPort,
      outputDebuggerConfigs: options.outputDebuggerConfigs
    }
  });
  await localRunner.invoke(identifier, event);
}

/**
 * Get event content from a file. It reads event from stdin if the file is "-".
 *
 * @param file the file from which to read the event content, or "-" to read from stdin.
 * @returns {Promise<String>}
 */
function getEvent(file) {
  return new Promise((resolve, reject) => {
    let input;
    if (file === '-') {
      console.log(`Reading event data from stdin, which can be ended with Enter then Ctrl+D
(you can also pass it from file with -e)`);
      input = process.stdin;
    } else {
      input = fs.createReadStream(file, {
        encoding: 'utf-8'
      });
    }
    const rl = readline.createInterface({
      input,
      output: process.stdout
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
      reject(new Error('^C'));
    });
  });
}

module.exports = invoke;