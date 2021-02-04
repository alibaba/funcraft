#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');
const { autoExit } = require('../lib/unref-timeout');

program
  .name('fun package')
  .usage('[options]')
  .description('packages the local artifacts to oss. In order that you can deploy your application directly through a template file') 
  .option('-t, --template <template>', 'The template file path')
  .option('-b, --oss-bucket <bucket>', 'The name of the oss bucket where Fun uploads local artifacts')
  .option('-o, --output-template-file <filename>', 'The output path of the packaged template file')
  .option('--use-nas', 'Automatically upload local resources to NAS.')
  .option('--push-registry <pushRegistry>', 'Modify the image upload path')
  .option('-y, --assume-yes', 'Automatic yes to prompts. Assume "yes" as answer to all prompts and run non-interactively.\n')
  .parse(process.argv);

if (program.args.length > 1) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[1]);
  program.help();
}

notifier.notify();

getVisitor().then(visitor => {

  visitor.pageview('/fun/package').send();

  require('../lib/commands/package')(program)
    .then(() => {
      visitor.event({
        ec: 'package',
        ea: 'package',
        el: 'success',
        dp: '/fun/package'
      }).send();

      autoExit();
    })
    .catch(error => {
      visitor.event({
        ec: 'package',
        ea: 'package',
        el: 'error',
        dp: '/fun/package'
      }).send();

      require('../lib/exception-handler')(error);
    });
});
