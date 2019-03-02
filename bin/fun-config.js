#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

program
  .name('fun config')
  .description('Configure the fun.')
  .parse(process.argv);

if (program.args.length) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[0]);
  program.help();
}

require('../lib/commands/config')()
  .catch(require('../lib/exception-handler'));