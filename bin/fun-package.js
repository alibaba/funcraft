#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun package')
  .usage('[options] [resource]') // todo: 
  .description('xx') // todo: 
  .option('-t, --template <template>', 'path of fun template file.') // todo: 
  .option('-b, --oss-bucket <bucket>', 'b') // todo: 
  .option('-o, --output-template-file <filename>', 'a') // todo: 
  .parse(process.argv);

if (program.args.length > 1) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[1]);
  program.help();
}

notifier.notify();

getVisitor().then(visitor => {

  visitor.pageview('/fun/deploy').send();

  require('../lib/commands/package')(program)
    .then(() => {
      visitor.event({
        ec: 'package',
        ea,
        el: 'success',
        dp: '/fun/package'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'package',
        ea,
        el: 'error',
        dp: '/fun/package'
      }).send();
  
      require('../lib/exception-handler')(error);
    });
});
