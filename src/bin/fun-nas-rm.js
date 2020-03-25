#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun nas rm')
  .description('Remove remote NAS file.')
  .usage('[options] <nas_dir>')
  .option('-r, --recursive', 'Remove folders recursively')
  .option('-f, --force', 'Remove files without prompting for confirmation')
  .parse(process.argv);


if (!program.args.length) {
  console.error();
  console.error("  error: missing argument [nasDir]");
  program.help();
}

notifier.notify();

getVisitor(true).then((visitor) => {
  visitor.pageview('/fun/nas/rm').send();

  require('../lib/commands/nas/rm')(program.args[0], program)
    .then(() => {
      visitor.event({
        ec: 'rm',
        ea: `rm`,
        el: 'success',
        dp: '/fun/nas/rm'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'rm',
        ea: `rm`,
        el: 'error',
        dp: '/fun/nas/rm'
      }).send();

      require('../lib/exception-handler')(error);
    });
    
});
