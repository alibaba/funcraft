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

  .option('-t, --template [template]', 'The path of fun template file.')
  .option('-c, --only-config', 'Update only configuration flags')
  .option('-y --assume-yes', 'Assume Yes to all queries and do not prompt')
  .option('--use-ros', 'Deploy resources using ROS')
  .option('--stack-name <stackName>', 'The name of the ROS stack')
  .parse(process.argv);


if (program.args.length > 1) {
  console.error();
  console.error("  error: unexpected argument '%s'", program.args[1]);
  program.help();
}

const context = {
  resourceName: program.args[0],
  onlyConfig: program.onlyConfig || false,
  template: program.template,
  useRos: program.useRos,
  stackName: program.stackName,
  assumeYes: program.assumeYes || false
};

notifier.notify();

getVisitor().then(visitor => {

  let ea;

  if (context.useRos) {
    ea = 'ros';
  } else {
    ea = context.resourceName ? `deploy ${ context.resourceName }` : 'deploy';
  }

  visitor.pageview('/fun/deploy').send();

  require('../lib/commands/deploy')(context)
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
