#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

program
  .name('fun nas')
  .description('Operate your remote NAS file system locally.')
  .command('info', 'Print nas config information, such as local temp directory of NAS.')
  .command('init', 'For each service with NAS config, create local NAS folder and deploy fun nas server service.')
  .command('sync', 'Synchronize the local NAS directory with the remote NAS file system.')
  .command('ls', 'List contents of remote NAS directory');

// Print help information if commands are unknown.
program.on('command:*', (cmds) => {
  if (!program.commands.map((command) => command.name()).includes(cmds[0])) {
    console.error();
    console.error("  error: unknown command '%s'", cmds[0]);
    program.help();
  }
});

program.parse(process.argv);
