#!/usr/bin/env node

'use strict';

const handler = require('../lib/exception-handler');

const Command = require('commander').Command;

const program = new Command('fun local');

program.description('local run your serverless application');

program
  .command('invoke <invokeName>')
  .usage('invoke [options] <[service/]function>')
  .option('-d, --debug-port <port>', 'used for local debugging')
  // todo: generate、detect、autoconfig vscode debug config options
  .description('Run your serverless application locally for quick development & testing.') 
  .option('-e, --event <path>', 'event file containing event data passed to the function')
  .action(function(invokeName, options) {
    require('../lib/commands/local')(invokeName, options).catch(handler);
  });

program.addListener('command:*', function() {
  program.help();
});

program.parse(process.argv);

if (!program.args.length) {program.help();}
