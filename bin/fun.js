#!/usr/bin/env node

'use strict';

const handler = require('../lib/exception-handler');

const program = require('commander');
const debug = require('debug');

program.version(require('../package.json').version, '-v, --version')
  // todo: describing
  .description('The fun tool use template.yml to describe the API Gateway & Function Compute things, then publish it online.')
  .option('--verbose', 'Print out more logs')
  // git-style sub-commands https://github.com/tj/commander.js/#git-style-sub-commands
  // source code see: https://github.com/tj/commander.js/blob/master/index.js#L525-L570
  // For the current case, the commander will look for fun-local.js as sub-command in the directory where fun is located.
  .command('local', 'Run your serverless application locally for quick development & testing.');

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
