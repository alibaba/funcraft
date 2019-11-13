#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

program
  .name('fun local')
  .description('Run your serverless application locally for quick development & testing.')
  .command('invoke', 'Invoke a function locally once')
  .command('start', 'Runs your HttpTriggers and APIs locally');

require('../lib/utils/command').registerCommandChecker(program);

program.parse(process.argv);
