#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

program
  .name('fun local')
  .description('Run your serverless application locally for quick development & testing.')
  .command('invoke', 'Invoke a function locally once')
  .command('start', 'Runs your HttpTriggers and APIs locally');

// Print help information if commands are unknown.
program.on('command:*', (cmds) => {
  if (!program.commands.map((command) => command.name()).includes(cmds[0])) {
    console.error();
    console.error("  error: unknown command '%s'", cmds[0]);
    program.help();
  }
});

program.parse(process.argv);
