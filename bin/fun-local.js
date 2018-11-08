#!/usr/bin/env node

'use strict';

const handler = require('../lib/exception-handler');

const Command = require('commander').Command;

const program = new Command("fun local");

program.description('local run your serverless application');

program
    .command("invoke <invokeName>")
    .usage("invoke [options] <[service/]function>")
    .option('-d, --debug-port <port>', "used for local debugging")
    // todo: generate vscode debug config options
    .description("run your function on local") // todo: 
    .action(function(invokeName, options) {
        require('../lib/commands/local')(invokeName, options).catch(handler);
    });

program.addListener("command:*", function() {
  program.help();
});

program.parse(process.argv);

if (!program.args.length) {program.help();}
