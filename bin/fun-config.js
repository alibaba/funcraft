#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const visitor = require('../lib/visitor');

program
  .name('fun config')
  .description('Configure the fun.')
  .parse(process.argv);

if (program.args.length) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[0]);
  program.help();
}

visitor.pageview('/fun/config').send();

require('../lib/commands/config')()
  .then(() => {
    visitor.event({
      ec: 'config',
      ea: 'config',
      el: 'success',
      dp: '/fun/config'
    }).send();
  })
  .catch(error => {
    visitor.event({
      ec: 'config',
      ea: 'config',
      el: 'error',
      dp: '/fun/config'
    }).send();

    require('../lib/exception-handler')(error);
  });