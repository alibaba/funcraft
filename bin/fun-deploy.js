#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun deploy')
  .description('Deploy a serverless application.')
  .option('-t, --template [template]', 'path of fun template file.', null)
  .parse(process.argv);

if (program.args.length) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[0]);
  program.help();
}

notifier.notify();

getVisitor().then(visitor => {
  visitor.pageview('/fun/deploy').send();

  require('../lib/commands/deploy')(null, program.template)
    .then(() => {
      visitor.event({
        ec: 'deploy',
        ea: 'deploy',
        el: 'success',
        dp: '/fun/deploy'
      }).send();
    })
    .catch(error => {    
      visitor.event({
        ec: 'deploy',
        ea: 'deploy',
        el: 'error',
        dp: '/fun/deploy'
      }).send();
  
      require('../lib/exception-handler')(error);
    });
});

