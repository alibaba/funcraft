#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

program
  .name('fun local invoke')
  .description(
    `Execute your function in a local environment which replicates the live environment
  almost identically. You can pass in the event body via stdin or by using the -e (--event)
  parameter.`
  )
  .usage('[options] <[service/]function>')
  .option('-d, --debug-port <port>', 'specify the sandboxed container starting in debug' +
                                     ' mode, and exposing this port on localhost')
  // todo: add auto option to auto config vscode
  .option('-c, --config <ide/debugger>', 'output ide debug configuration. Options are vscode')
  .option('-e, --event <path>', 'event file containing event data passed to the function')
  .parse(process.argv);

if (!program.args.length) {
  console.error();
  console.error("  error: missing required argument '%s'", '[service/]function');
  program.help();
}

if (!program.args.length > 1) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[1]);
  program.help();
}

require('../lib/commands/local/invoke')(program.args[0], program)
  .then(() =>  {
    // fix windows not auto exit bug after docker.run
    process.exit(0);
  })
  .catch(require('../lib/exception-handler'));

