#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun nas rm')
  .description('Remove remote NAS file or folder.')
  .usage('[options] <nas_file>')
  .option('-R, --recursive', 'remove folders recursively')
  .option('-f, --force', 'remove files without prompting for confirmation')
  .parse(process.argv);

const context = {
  name: program.name,
  recursive: program.recursive,
  force: program.force
};

if (program.args.length > 0) {
  context.nasTarget = program.args[0];
} else {
  program.help();
  return;
}

notifier.notify();

getVisitor(true).then((visitor) => {
  visitor.pageview('/fun/nas/rm').send();

  require('../lib/commands/nas/rm')(context)
    .then(() => {
      visitor.event({
        ec: 'rm',
        ea: `rm ${context.nasTarget}`,
        el: 'success',
        dp: '/fun/nas/rm'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'rm',
        ea: `rm ${context.nasTarget}`,
        el: 'error',
        dp: '/fun/nas/rm'
      }).send();

      require('../lib/exception-handler')(error);
    });
    
});



