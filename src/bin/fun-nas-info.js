#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun nas info')
  .description('Print nas config information, such as local temp directory of NAS.')
  .option('-t, --template [template]', 'The path of fun template file.')
  .parse(process.argv);

if (program.args.length) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[0]);
  program.help();
}

notifier.notify();

getVisitor(true).then((visitor) => {
  visitor.pageview('/fun/nas/info').send();

  require('../lib/commands/nas/info')(program.template)
    .then(() => {
      visitor.event({
        ec: 'info',
        ea: 'info',
        el: 'success',
        dp: '/fun/nas/info'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'info',
        ea: 'info',
        el: 'error',
        dp: '/fun/nas/info'
      }).send();

      require('../lib/exception-handler')(error);
    });
});


