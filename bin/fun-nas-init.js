#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun nas init')
  .description('For each service with NAS config, create local NAS folder and deploy fun nas server service.')
  .parse(process.argv);

if (program.args.length) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[0]);
  program.help();
}

notifier.notify();

getVisitor(true).then((visitor) => {
  visitor.pageview('/fun/nas/init').send();

  require('../lib/commands/nas/init')()
    .then(() => {
      visitor.event({
        ec: 'init',
        ea: 'init',
        el: 'success',
        dp: '/fun/nas/init'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'init',
        ea: 'init',
        el: 'error',
        dp: '/fun/nas/init'
      }).send();

      require('../lib/exception-handler')(error);
    });
});
