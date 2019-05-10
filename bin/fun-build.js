#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;

program
  .name('fun build')
  .description('Build the dependencies.')
  .parse(process.argv);

if (program.args.length) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[0]);
  program.help();
}

getVisitor().then(visitor => {
  visitor.pageview('/fun/build').send();

  require('../lib/commands/build')()
    .then(() => {
      visitor.event({
        ec: 'build',
        ea: 'build',
        el: 'success',
        dp: '/fun/build'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'build',
        ea: 'build',
        el: 'error',
        dp: '/fun/build'
      }).send();

      require('../lib/exception-handler')(error);
    });
});


