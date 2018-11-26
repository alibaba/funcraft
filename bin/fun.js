#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const debug = require('debug');

program
  .version(require('../package.json').version, '-v, --version')
  .description(
    `The fun command line providers a complete set of commands to define, develop, test
  serverless applications locally, and deploy them to the Alibaba Cloud.`
  )
  .option('--verbose', 'verbose output')
  // See git-style sub-commands https://github.com/tj/commander.js/#git-style-sub-commands.
  // See source code: https://github.com/tj/commander.js/blob/master/index.js#L525-L570.

  // The commander will try to search the executables in the directory of the entry script
  // (like ./examples/pm) with the name program-command.
  .command('config', 'configure the fun')
  .command('build', 'build the dependencies')
  .command('local', 'run your serverless application locally')
  .command('validate', 'validate a fun template')
  .command('deploy', 'deploy a fun application');

program.on('option:verbose', () => {
  debug.enable('*');
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