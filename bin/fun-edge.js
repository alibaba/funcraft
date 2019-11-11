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

require('../lib/utils/command').registerCommandChecker(program);

program.parse(process.argv);
