#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');


program
  .name('fun edge invoke')
  .description(
    `Execute your function in a local Link IoT Edge environment which replicates the release
  environment almost identically. You can pass in the event body via stdin or by using
  the -e (--event) parameter.`)
  .usage('[options] <[service/]function>')
  .option('--debug',
    `Specify your function executes in debug mode, and listens
                             on port 5700 at localhost for debuggers to connect`)
  .option('-e, --event <path>',
    `A file containing event data passed to the function during
                             invoke, If this option is not specified, it defaults to
                             reading event from stdin`)
  .option('-c, --config <ide/debugger>',
    `Output configurations for the specified ide/debugger, where
                             the ide/debugger can currently only be vscode`)
  .option('--output-debugger-configs',
    `Output configurations for all debuggers. It will override
                             the behavior of --config option`)
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
    throw new Error(`\n  error: not a number '${program.debugPort}'\n`);
  }
  program.debugPort = debugPort;
}

// Check config values.
if (program.config) {
  if (program.config !== 'vscode') {
    throw new Error(`\n  error: invalid value '${program.config}'\n`);
  }
  program.outputDebuggerConfigs = true;
}

program.event = program.event || '-';

notifier.notify();

getVisitor().then(visitor => {
  visitor.pageview('/fun/edge/invoke').send();

  require('../lib/commands/edge/invoke')(program.args[0], program)
    .then(() => {
      visitor.event({
        ec: 'edge',
        ea: 'invoke',
        el: 'success',
        dp: '/fun/edge'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'edge',
        ea: 'invoke',
        el: 'error',
        dp: '/fun/edge'
      }).send();
  
      require('../lib/exception-handler')(error);
    });  
});

