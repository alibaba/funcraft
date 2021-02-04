#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');
const { autoExit } = require('../lib/unref-timeout');

program
  .name('fun build')
  .usage('[options] [[service/]function]')
  .description('Build the dependencies.')
  .option('-d, --use-docker', 'Use docker container to build functions')
  .option('-b, --use-buildkit', 'Use buildkit to build functions')
  .option('-y, --assume-yes', 'Automatic yes to prompts. Assume "yes" as answer to all prompts and run non-interactively.\n')
  .option('-t, --template [template]', 'The path of fun template file.')
  .parse(process.argv);

if (program.args.length > 1) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[0]);
  program.help();
}

notifier.notify();

getVisitor().then(visitor => {
  visitor.pageview('/fun/build').send();

  program.verbose = parseInt(process.env.FUN_VERBOSE) > 0;

  require('../lib/commands/build')(program.args[0], program)
    .then(() => {
      visitor.event({
        ec: 'build',
        ea: 'build',
        el: 'success',
        dp: '/fun/build'
      }).send();

      autoExit();
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


