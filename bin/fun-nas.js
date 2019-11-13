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
  .command('ls', 'List contents of remote NAS directory')
  .command('rm', 'Remove remote NAS file.');

require('../lib/utils/command').registerCommandChecker(program);

program.parse(process.argv);
