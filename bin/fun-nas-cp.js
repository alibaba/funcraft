#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun nas cp')
  .usage('[options] <source_file> <target_file>')
  .description('Copy files and folders between local position and remote NAS')
  .option('-R, --recursive', 'copy folders recursively')
  //.option('-f, --force', 'cover the target_file whose name is the same with source_file')
  //.option('-n, --next', 'skip the target_file whose name is the same with source_file')
  .parse(process.argv);

const context = {
  name: program.name,
  recursive: program.recursive,
  force: program.force,
  skip: program.next
};

if (program.args.length > 1) {
  context.src = program.args[0];
  context.dst = program.args[1];
} else {
  program.help();
  return;
}

notifier.notify();

getVisitor().then(visitor => {
  visitor.pageview('/fun/nas/cp').send();

  require('../lib/commands/nas/cp')(context)
    .then(() => {
      visitor.event({
        ec: 'cp',
        ea: `cp ${context.src} to ${context.dst}`,
        el: 'success',
        dp: '/fun/nas/cp'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'cp',
        ea: `cp ${context.src} to ${context.dst}`,
        el: 'error',
        dp: '/fun/nas/cp'
      }).send();
  
      require('../lib/exception-handler')(error);
    });
});
