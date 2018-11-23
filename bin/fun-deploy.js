#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

program
  .name('fun deploy')
  .description('Deploy a serverless application.')
  .parse(process.argv);

if (program.args.length) {
  console.error();
  console.error("  error: unexpected argument `%s'", program.args[0]);
  program.help();
}

require('../lib/commands/deploy')()
  .catch(require('../lib/exception-handler'));