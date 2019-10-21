#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun nas cp')
  .description('Copy file/folder between remote NAS and local path.')
  .usage('[options] <src_path> <dst_path>')
  .option('-r, --recursive', 'copy folders recursively')
  .option('-n, --no-clobber', 'Do not overwrite an existing file')
  .parse(process.argv);

if (program.args.length < 2) {
  console.error();
  console.error("  error: too few arguments");
  program.help();
} else if (program.args.length < 2) {
  console.error();
  console.error("  error: too many arguments");
  program.help();
}

notifier.notify();

getVisitor(true).then((visitor) => {
  visitor.pageview('/fun/nas/cp').send();

  require('../lib/commands/nas/cp')(program.args[0], program.args[1], program)
    .then(() => {
      visitor.event({
        ec: 'cp',
        ea: `cp`,
        el: 'success',
        dp: '/fun/nas/cp'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'cp',
        ea: `cp`,
        el: 'error',
        dp: '/fun/nas/cp'
      }).send();

      require('../lib/exception-handler')(error);
    });
    
});
