#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const debug = require('debug');

program
  .version(require('../package.json').version, '--version')
  .description(`The fun command line provides a complete set of commands to define, develop,
test serverless applications locally, and deploy them to the Alibaba Cloud.`)
  .option('-v, --verbose', 'verbose output', (_, total) => total + 1, 0)
  // See git-style sub-commands https://github.com/tj/commander.js/#git-style-sub-commands.
  // See source code: https://github.com/tj/commander.js/blob/master/index.js#L525-L570.

  // The commander will try to search the executables in the directory of the entry script
  // (like ./examples/pm) with the name program-command.
  .command('config', 'Configure the fun')
  .command('init', 'Initialize a new fun project')
  .command('install', 'Install dependencies which are described in fun.yml')
  .command('build', 'Build the dependencies')
  .command('local', 'Run your serverless application locally')
  .command('edge', 'Run your serverless application at edge')
  .command('validate', 'Validate a fun template')
  .command('deploy', 'Deploy a fun application')
  .command('nas', 'Operate NAS file system')
  .command("package", 'Package a Function Compute application')
  .command('invoke', 'Remote invoke function');
// set default verbose value for subcommand.
process.env.FUN_VERBOSE = 0;

program.on('option:verbose', () => {
  if (program.verbose === 4) {
    debug.enable('*');
  }
  process.env.FUN_VERBOSE = program.verbose;
});

require('../lib/utils/command').registerCommandChecker(program);

program.parse(process.argv);