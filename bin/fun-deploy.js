#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun deploy')
  .description('Deploy a serverless application.')
  .option('-t, --template [template]', 'path of fun template file.', null)
  .option('-u, --update-config', 'Update only configuration flags')
  .parse(process.argv);


validateCommandParameters(program);

const context = {
  resourceName: program.args[0],
  updateConfig: program.updateConfig || false,
  template: program.template
};

notifier.notify();

getVisitor().then(visitor => {
  visitor.pageview('/fun/deploy').send();

  require('../lib/commands/deploy')(null, context)
    .then(() => {
      visitor.event({
        ec: 'deploy',
        ea: 'deploy',
        el: 'success',
        dp: '/fun/deploy'
      }).send();
    })
    .catch(error => {    
      visitor.event({
        ec: 'deploy',
        ea: 'deploy',
        el: 'error',
        dp: '/fun/deploy'
      }).send();
  
      require('../lib/exception-handler')(error);
    });
});


function validateCommandParameters(program) {

  if (program.updateConfig !== true && program.updateConfig !== false && program.updateConfig !== undefined) {
    console.error();
    console.error("  error: unexpected argument '%s'", program.updateConfig);
    program.help();
  }
    
  if (program.args.length > 1) {
    console.error();
    console.error("  error: unexpected argument '%s'", program.args[1]);
    program.help();
  }
}

