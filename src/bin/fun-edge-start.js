#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

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

notifier.notify();

getVisitor().then(visitor => {
  visitor.pageview('/fun/edge/start').send();

  require('../lib/commands/edge/start')()
    .then(() => {
      visitor.event({
        ec: 'edge',
        ea: 'start',
        el: 'success',
        dp: '/fun/edge'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'edge',
        ea: 'start',
        el: 'error',
        dp: '/fun/edge'
      }).send();
  
      require('../lib/exception-handler')(error);
    });  
});

