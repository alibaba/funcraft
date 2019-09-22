#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const unrefTimeout = require('../lib/unref-timeout');
const notifier = require('../lib/update-notifier');

program
  .name('fun local invoke')
  .description(
    `Execute your function in a local environment which replicates the live environment
  almost identically. You can pass in the event body via stdin or by using the -e (--event)
  parameter.`)
  .usage('[options] <[service/]function>')
  .option('-t, --template [template]', 'The path of fun template file.')
  .option('-d, --debug-port <port>',
    `Specify the sandboxed container starting in debug mode,
                             and exposing this port on localhost`)
  .option('-c, --config <ide/debugger>', 
    'Select which IDE to use when debugging and output related debug config tips for the IDE. Options：\'vscode\', \'pycharm\'')
  .option('-e, --event <path>',
    `A file containing event data passed to the function during
                             invoke, If this option is not specified, it defaults to
                             reading event from stdin`)
  .option('--debugger-path <debuggerPath>', 'the path of the debugger on the host')
  .option('--debug-args <debugArgs>', 'additional parameters that will be passed to the debugger')
  .option('--tmp-dir <tmpDir>', `The temp directory mounted to /tmp , default to './.fun/tmp/invoke/{service}/{function}/'`)
  .option('--no-reuse', `Do not reuse the container which was started by the 'fun local start {service}/{function}' command.`)
  .parse(process.argv);

if (program.args.length > 1) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[1]);
  program.help();
}

notifier.notify();

getVisitor().then(visitor => {
  visitor.pageview('/fun/local/invoke').send();

  require('../lib/commands/local/invoke').invoke(program.args[0], program)
    .then(() => {
      visitor.event({
        ec: 'local invoke',
        ea: 'invoke',
        el: 'success',
        dp: '/fun/local/invoke'
      }).send();
  
      // fix windows not auto exit bug after docker operation
      unrefTimeout(() => {
        process.exit(0); // eslint-disable-line
      });
    })
    .catch(error => {    
      visitor.event({
        ec: 'local invoke',
        ea: 'invoke',
        el: 'error',
        dp: '/fun/local/invoke'
      }).send();
  
      require('../lib/exception-handler')(error);
    });  
});
