#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun invoke')
  .description('invoke deployed function.')
  .option('-e, --event [event]', `Event data (strings) passed to the function during invocation,
           which is empty sting by default if this option is not specified`, '')
  .option('-f, --event-file <path>', `A file containing event data passed to the function during invoke.`)
  .option('-s, --event-stdin', 'Read from standard input, to support script pipeline.')
  .option('-t, --invocation-type <invocationType>', `Invocation type: optional value "async"|"sync", default value "sync"`, 'sync')

  .parse(process.argv);

if (program.args.length > 1) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[1]);
  program.help();
}

notifier.notify();

getVisitor().then(visitor => {
  visitor.pageview('/fun/invoke').send();

  require('../lib/commands/invoke')(program.args[0], program)
    .then(() => {
      visitor.event({
        ec: 'invoke',
        ea: 'invoke',
        el: 'success',
        dp: '/fun/invoke'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'invoke',
        ea: 'invoke',
        el: 'error',
        dp: '/fun/invoke'
      }).send();

      require('../lib/exception-handler')(error);
    });
});