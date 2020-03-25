#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

const getVisitor = require('../lib/visitor').getVisitor;

const notifier = require('../lib/update-notifier');

program
  .name('fun validate')
  .description('Validate a fun template.')
  .option('-t, --template [template]', 'The path of fun template file.', 'template.[yaml|yml]')
  .parse(process.argv);

if (program.args.length) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[0]);
  program.help();
}

notifier.notify();

getVisitor().then(visitor => {
  visitor.pageview('/fun/validate').send();

  require('../lib/commands/validate')(program.template)
    .then(() => {
      visitor.event({
        ec: 'validate',
        ea: 'validate',
        el: 'success',
        dp: '/fun/validate'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'validate',
        ea: 'validate',
        el: 'error',
        dp: '/fun/validate'
      }).send();

      require('../lib/exception-handler')(error);
    });
});
