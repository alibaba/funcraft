#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

program
  .name('fun edge stop')
  .description('Stop the local Link IoT Edge environment.')
  .parse(process.argv);

if (program.args.length) {
  console.error();
  console.error("  error: unexpected argument `%s'", program.args[1]);
  program.help();
}

require('../lib/commands/edge/stop')()
  .catch(require('../lib/exception-handler'));