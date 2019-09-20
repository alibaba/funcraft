#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

program
  .name('fun edge')
  .description(
    `Run your serverless application at edge (within local Link IoT Edge environment) for
  quick development & testing.`)
  .command('invoke', 'Invoke a function at edge once')
  .command('start', 'Launch one local Link IoT Edge environment, or create one if none exist')
  .command('stop', 'Stop the local Link IoT Edge environment');

// Print help information if commands are unknown.
program.on('command:*', (cmds) => {
  if (!program.commands.map((command) => command.name()).includes(cmds[0])) {
    console.error();
    console.error("  error: unknown command `%s'", cmds[0]);
    program.help();
  }
});

program.parse(process.argv);
