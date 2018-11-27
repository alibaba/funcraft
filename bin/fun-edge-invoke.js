#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

program
  .name('fun edge invoke')
  .description(
    `Execute your function in a local Link IoT Edge environment which replicates the release
  environment almost identically. You can pass in the event body via stdin or by using
  the -e (--event) parameter.`)
  .usage('[options] <[service/]function>')
  .option('--debug',
    `specify your function executes in debug mode, and listens
                           on port 5700 at localhost for debuggers to connect`)
  .option('-e, --event <path>',
    `a file containing event data passed to the function during
                           invoke, If this option is not specified, it defaults to
                           reading event from stdin`)
  .option('--output-debugger-configs',
    `output configurations for debuggers, currently only vscode`)
  .parse(process.argv);

if (!program.args.length) {
  console.error();
  console.error("  error: missing required argument `%s'", '[service/]function');
  program.help();
}

if (!program.args.length > 1) {
  console.error();
  console.error("  error: unexpected argument `%s'", program.args[1]);
  program.help();
}

// The debug port can't be configured at present since the debugging container is
// pre-created. It will be supported when the debugging container is created according
// to the template.yaml.
if (program.debug) {
  program.debugPort = '5700';
}
if (program.debugPort) {
  const debugPort = parseInt(program.debugPort);
  if (Number.isNaN(debugPort)) {
    console.error();
    console.error("  error: not a number `%s'", program.debugPort);
    console.error();
    process.exit(-1);
  }
  program.debugPort = debugPort;
}

program.event = program.event || '-';

require('../lib/commands/edge/invoke')(program.args[0], program)
  .catch(require('../lib/exception-handler'));

