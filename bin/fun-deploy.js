#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

program
  .name('fun deploy')
  .usage('[options] [resource]') 
  .description(`
  Deploy a serverless application.

  use 'fun deploy' to deploy all resources
  use 'fun deploy serviceName' to deploy all functions under a service
  use 'fun deploy functionName' to deploy only a function resource

  with '--only-config' parameter, will only update resource config without updating the function code`)

  .option('-t, --template [template]', 'path of fun template file.')
  .option('-c, --only-config', 'Update only configuration flags')
  .parse(process.argv);


if (program.args.length > 1) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[1]);
  program.help();
}

const context = {
  resourceName: program.args[0],
  onlyConfig: program.onlyConfig || false,
  template: program.template
};

notifier.notify();

getVisitor().then(visitor => {

  const ea = context.resourceName ? `deploy ${ context.resourceName }` : 'deploy';

  visitor.pageview('/fun/deploy').send();

  require('../lib/commands/deploy')(null, context)
    .then(() => {
      visitor.event({
        ec: 'deploy',
        ea,
        el: 'success',
        dp: '/fun/deploy'
      }).send();
    })
    .catch(error => {
      visitor.event({
        ec: 'deploy',
        ea,
        el: 'error',
        dp: '/fun/deploy'
      }).send();
  
      require('../lib/exception-handler')(error);
    });
});
