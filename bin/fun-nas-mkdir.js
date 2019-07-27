#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun nas mkdir')
  .description('Make remote nas directory.')
  .usage('[options] <nas_dir>')
  .option('-v, --verbose', 'Be verbose when creating directories, listing them as they are created.')
  .option('-p, --parents', 'Make directory recursively')
  .option('-m, --mode <mode>', 'Set the file permission bits of the final created directory to the specified mode.')
  .parse(process.argv);

const context = {
  name: program.name,
  verbose: program.verbose,
  mode: program.mode,
  parents: program.parents
};

if (program.args.length > 0) {
  context.nasDir = program.args[0];
} else {
  program.help();
  return;
}
notifier.notify();

getVisitor(true).then((visitor) => {
  visitor.pageview('/fun/nas/mkdir').send();

  require('../lib/commands/nas/mkdir')(context)
    .then(() => {
      visitor.event({
        ec: 'mkdir',
        ea: `mkdir ${context.nasDir}`,
        el: 'success',
        dp: '/fun/nas/mkdir'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'mkdir',
        ea: `mkdir ${context.nasDir}`,
        el: 'error',
        dp: '/fun/nas/mkdir'
      }).send();

      require('../lib/exception-handler')(error);
    });
    
});



