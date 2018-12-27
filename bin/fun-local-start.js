#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

program
  .name('fun local start')
  .description(`
    Allows you to run the Function Compute applicatoin locally for quick development & testing.
    It will start an http server locally to receive requests for http triggers and apis.
    It scans all functions in template.yml. If the resource type is HTTP, it will be registered to this http server, which can be triggered by the browser or some http tools.
    For other types of functions, they will be registered as apis, which can be called by sdk in each language or directly via api.
    
    Function Compute will look up the code by CodeUri in template.yml.
    For interpreted languages, such as node, python, php, the modified code will take effect immediately, without restarting the http server.
    For compiled languages such as java, we recommend you set CodeUri to the compiled or packaged localtion.
    Once compiled or packaged result changed, the modified code will take effect without restarting the http server.`
  )
  .usage('[options]')
  .option('-d, --debug-port <port>', 'specify the sandboxed container starting in debug' +
        ' mode, and exposing this port on localhost') 
  .option('-c, --config <ide/debugger>', 'output ide debug configuration. Options are vscode')
  .parse(process.argv);

if (program.args.length) {
  console.error();
  console.error("  error: unexpected argument `%s'", program.args[0]);
  program.help();
}

require('../lib/commands/local/start')(program)
  .catch(require('../lib/exception-handler'));
