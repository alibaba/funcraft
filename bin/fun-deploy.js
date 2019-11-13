#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');
const getVisitor = require('../lib/visitor').getVisitor;
const notifier = require('../lib/update-notifier');

const { parsePairs } = require('../lib/build/parser');

program
  .name('fun deploy')
  .usage('[options] [resource]')
  .description(`
  Deploy a serverless application.

  use 'fun deploy' to deploy all resources
  use 'fun deploy serviceName' to deploy all functions under a service
  use 'fun deploy functionName' to deploy only a function resource

  with '--only-config' parameter, will only update resource config without updating the function code

  use '--parameter-override', A parameter structures that specify input parameters for your stack template.
                              If you're updating a stack and you don't specify a parameter, the command uses the stack's existing value.
                              For new stacks, you must specify parameters that don't have a default value. Syntax: parameterkey=parametervalue.
  `)


  .option('-t, --template [template]', 'The path of fun template file.')
  .option('-c, --only-config', 'Update only configuration flags')
  .option('-y, --assume-yes', 'Automatic yes to prompts. Assume "yes" as answer to all prompts and run non-interactively.\n')
  .option('--use-ros', 'Deploy resources using ROS')
  .option('--stack-name <stackName>', 'The name of the ROS stack')
  .option('--parameter-override <parameter>', `A parameter structures that specify input parameters for your stack template.`, parsePairs)
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
  assumeYes: program.assumeYes || false,
  parameterOverride: program.parameterOverride
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
