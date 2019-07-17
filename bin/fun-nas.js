#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const debug = require('debug');

program
  .name('fun nas')
  .version(require('../package.json').version, '--version')
  .description(
    `The fun nas command line provides a set of commands to manage remote NAS  locally.`
  )
  .option('-v, --verbose', 'verbose output', (_, total) => total + 1, 0)
  // See git-style sub-commands https://github.com/tj/commander.js/#git-style-sub-commands.
  // See source code: https://github.com/tj/commander.js/blob/master/index.js#L525-L570.

  // The commander will try to search the executables in the directory of the entry script
  // (like ./examples/pm) with the name program-command.
  .command('init', 'create local nas directory and deploy fun nas server function to the Alibaba Cloud')
  .command('info', 'print information about local nas directory')
  .command('sync', 'upload local nas to remote nas');

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
