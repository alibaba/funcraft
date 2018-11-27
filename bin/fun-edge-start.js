#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

program
  .name('fun edge start')
  .description(
    `Launch one local Link IoT Edge environment for development & testing, or create one
  if none exist.`)
  .parse(process.argv);

if (program.args.length) {
  console.error();
  console.error("  error: unexpected argument `%s'", program.args[1]);
  program.help();
}

require('../lib/commands/edge/start')()
  .catch(require('../lib/exception-handler'));