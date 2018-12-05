#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

program
  .name('fun local start')
  .description(
    `` // todo: 
  )
  .usage('[options]')
  .option('-d, --debug-port <port>', 'specify the sandboxed container starting in debug' +
        ' mode, and exposing this port on localhost') // todo: 
  .option('--debug')
// todo: add auto option to auto config vscode
  .option('-c, --config <ide/debugger>', 'output ide debug configuration. Options are vscode')
  .parse(process.argv);

if (program.args.length) {
  console.error();
  console.error("  error: unexpected argument `%s'", program.args[0]);
  program.help();
}

require('../lib/commands/local/start')(program)
  .catch(require('../lib/exception-handler'));
