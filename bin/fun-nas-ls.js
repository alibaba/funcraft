#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun nas ls')
  .description('Print remote nas directory.')
  .usage('[options] <nas_dir>')
  .option('-a, --all', 'List all content of nas_dir')
  .option('-l, --list', 'List detailed information about the content')
  .parse(process.argv);

const context = {
  name: program.name,
  all: program.all,
  list: program.list
};

if (program.args.length > 0) {
  context.nasDir = program.args[0];
} else {
  program.help();
  return;
}
notifier.notify();

getVisitor(true).then((visitor) => {
  visitor.pageview('/fun/nas/ls').send();

  require('../lib/commands/nas/ls')(context)
    .then(() => {
      visitor.event({
        ec: 'ls',
        ea: `ls ${context.nasDir}`,
        el: 'success',
        dp: '/fun/nas/ls'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'ls',
        ea: `ls ${context.nasDir}`,
        el: 'error',
        dp: '/fun/nas/ls'
      }).send();

      require('../lib/exception-handler')(error);
    });
    
});



