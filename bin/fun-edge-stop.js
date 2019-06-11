#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun edge stop')
  .description('Stop the local Link IoT Edge environment.')
  .parse(process.argv);

if (program.args.length) {
  console.error();
  console.error("  error: unexpected argument `%s'", program.args[1]);
  program.help();
}

notifier.notify();

getVisitor().then(visitor => {
  visitor.pageview('/fun/edge/stop').send();

  require('../lib/commands/edge/stop')()
    .then(() => {
      visitor.event({
        ec: 'edge',
        ea: 'stop',
        el: 'success',
        dp: '/fun/edge'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'edge',
        ea: 'stop',
        el: 'error',
        dp: '/fun/edge'
      }).send();
  
      require('../lib/exception-handler')(error);
    });  
});
