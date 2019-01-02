#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

program
  .name('fun validate')
  .description('Validate a fun template.')
  .option('-t, --template [template]', 'path of fun template file.', 'template.[yaml|yml]')
  .parse(process.argv);

if (program.args.length) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[0]);
  program.help();
}

require('../lib/commands/validate')(program.template)
  .catch(require('../lib/exception-handler'));