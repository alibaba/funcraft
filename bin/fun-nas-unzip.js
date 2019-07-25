#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun nas unzip')
  .description('Unzip NAS zip file.')
  .usage('[options] <zipSrc>')
  .option('-n, --never', 'never overwrite existing files')
  .option('-o, --overwrite', 'overwrite files WITHOUT prompting')
  .option('-q, --quiet', 'quiet mode (-qq => quieter)')
  .option('-d, --exdir <dir>', 'extract files into exdir')
  .parse(process.argv);

const context = {
  name: program.name,
  never: program.never,
  overwrite: program.overwrite,
  quiet: program.quiet,
  exdir: program.exdir
};

if (program.args.length > 0) {
  context.zipSrc = program.args[0];
} else {
  program.help();
  return;
}
notifier.notify();

getVisitor(true).then((visitor) => {
  visitor.pageview('/fun/nas/unzip').send();

  require('../lib/commands/nas/unzip')(context)
    .then(() => {
      visitor.event({
        ec: 'unzip',
        ea: 'unzip',
        el: 'success',
        dp: '/fun/nas/unzip'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'unzip',
        ea: 'unzip',
        el: 'error',
        dp: '/fun/nas/unzip'
      }).send();

      require('../lib/exception-handler')(error);
    });
    
});



