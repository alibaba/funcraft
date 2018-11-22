#!/usr/bin/env node

'use strict';

const handler = require('../lib/exception-handler');

const Command = require('commander').Command;

const program = new Command('fun local');

program.description('local run your serverless application');

program
  .command('invoke <invokeName>')
  .usage('[options] <[service/]function>')
  .option('-d, --debug-port <port>', 'Used for local debugging')
  .description('Run your serverless application locally for quick development & testing.') 
  // todo: add auto option to auto config vscode
  .option('-c, --config <ide/debugger>', 'Print out ide debug configuration. Options are vscode')
  .option('-e, --event <path>', 'Event file containing event data passed to the function')
  .action(function(invokeName, options) {
    require('../lib/commands/local')(invokeName, options).catch(handler);
  });

program.addListener('command:*', function() {
  program.help();
});

program.parse(process.argv);

if (!program.args.length) {program.help();}
