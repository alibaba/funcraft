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
  .command('config', 'configure the fun')
  .command('init', 'initialize a new fun project')
  .command('install', 'install dependencies which are described in fun.yml')
  .command('build', 'build the dependencies')
  .command('local', 'run your serverless application locally')
  .command('edge', 'run your serverless application at edge')
  .command('validate', 'validate a fun template')
  .command('deploy', 'deploy a fun application')
  .command('nas', 'operate NAS file system')
  .command('invoke', 'remote invoke function');
// set default verbose value for subcommand.
process.env.FUN_VERBOSE = 0;

program.on('option:verbose', () => {
  if (program.verbose === 4) {
    debug.enable('*');
  }
  process.env.FUN_VERBOSE = program.verbose;
});

// Print help information if commands are unknown.
program.on('command:*', (cmds) => {
  if (!program.commands.map((command) => command.name()).includes(cmds[0])) {
    console.error();
    console.error("  error: unknown command `%s'", cmds[0]);
    program.help();
  }
});

program.parse(process.argv);