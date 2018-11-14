#!/usr/bin/env node

'use strict';

const handler = require('../lib/exception-handler');

const program = require('commander');
const debug = require('debug');

program.version(require('../package.json').version, '-v, --version')
  .description('The fun tool use template.yml to describe the API Gateway & Function Compute things, then publish it online.')
  .option('--verbose', 'Print out more logs')
  .command('local', 'local run your serverless application');

program.command('config')
  .description('Configure the fun')
  .action(() => {
    require('../lib/commands/config')().catch(handler);
  });

program.command('validate')
  .description('Validate a fun template')
  .option('-t, --template [template]', 'path of fun template file. defaults to \'template.{yaml|yml}\'', 'template.{yaml|yml}')
  .action((options) => {
    require('../lib/commands/validate')(options.template).catch(handler);
  });

program.command('deploy')
  .description('Deploy a project to AliCloud')
  .action((stage) => {
    require('../lib/commands/deploy')(stage).catch(handler);
  });

program.command('build')
  .description('Build the dependencies')
  .action(() => {
    require('../lib/commands/build')().catch(handler);
  });

program.addListener('option:verbose', function () {
  debug.enable('*');
});
 
program.addListener('command:*', function(cmds) {
  if (cmds[0] !== 'local') {
    program.help();
  }
});

program.parse(process.argv);

if (!program.args.length) { program.help(); }
