#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun nas ls')
  .description('List contents of remote NAS directory.')
  .usage('[options] <nas_dir>')
  .option('-a, --all', 'List all content of nas_dir')
  .option('-l, --long', 'List detailed information about the content')
  .parse(process.argv);


if (!program.args.length) {
  console.error();
  console.error("  error: missing argument [nasDir]");
  program.help();
}

notifier.notify();

getVisitor(true).then((visitor) => {
  visitor.pageview('/fun/nas/ls').send();

  require('../lib/commands/nas/ls')(program.args[0], program)
    .then(() => {
      visitor.event({
        ec: 'ls',
        ea: `ls`,
        el: 'success',
        dp: '/fun/nas/ls'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'ls',
        ea: `ls`,
        el: 'error',
        dp: '/fun/nas/ls'
      }).send();

      require('../lib/exception-handler')(error);
    });
    
});
