#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun local start')
  .description(`
    Allows you to run the Function Compute applicatoin locally for quick development & testing.
    It will start a http server locally to receive requests for http triggers and apis.
    It scans all functions in template.yml. If the resource type is HTTP, it will be registered to this http server, which can be triggered by the browser or any http tools.
    For other types of functions, they will be registered as apis, which can be called by sdk in each language or directly via api.

    Function Compute will look up the code by CodeUri in template.yml.
    For interpreted languages, such as node, python, php, the modified code will take effect immediately without restarting the http server.
    For compiled languages such as java, we recommend you set CodeUri to the compiled or packaged location.
    Once compiled or packaged result changed, the modified code will take effect immediately without restarting the http server.`
  )
  .usage('[options] <[service/]function>')
  .option('-d, --debug-port <port>', 'Specify the sandbox container starting in debug' +
    ' mode, and exposing this port on localhost')
  .option('-c, --config <ide/debugger>',
    'Select which IDE to use when debugging and output related debug config tips for the IDE. Options：\'vscode\', \'pycharm\'')
  .option('--debugger-path <debuggerPath>', 'The path of the debugger on the host')
  .option('--debug-args <debugArgs>', 'Additional parameters that will be passed to the debugger')
  .parse(process.argv);

if (program.args.length > 1) {
  console.error();
  console.error("  error: unexpected argument `%s'", program.args[1]);
  program.help();
}

notifier.notify();

getVisitor().then(visitor => {
  visitor.pageview('/fun/local/start').send();

  require('../lib/commands/local/start')(program, program.args[0])
    .then(() => {
      visitor.event({
        ec: 'local start',
        ea: 'start',
        el: 'success',
        dp: '/fun/local/start'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'local start',
        ea: 'start',
        el: 'error',
        dp: '/fun/local/start'
      }).send();

      require('../lib/exception-handler')(error);
    });
});

