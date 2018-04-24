#!/usr/bin/env node

'use strict';

const errHandle = function (err) {
  console.error(err.stack);
  process.exit(-1);
};

const yargs = require('yargs');

yargs.command('config', 'Configure the fun', {}, (argv) => {
  require('../lib/commands/config')().catch(errHandle);
})
  .command('validate', 'Validate FUN template file', (yargs) => {
    return yargs.option('template', {
      alias: 't',
      default: 'template.{yaml|yml}',
      desc: 'path of FUN template file.'
    })
      .version(false)
      .help('help');
  }, (argv) => {
    require('../lib/commands/validate')(argv.template).catch(errHandle);
  })
  .command('build', 'Build the dependencies', {}, (argv) => {
    require('../lib/commands/build')().catch(errHandle);
  })
  .command('deploy', 'Deploy a project to AliCloud', (yargs) => {
    return yargs.option('stage', {
      alias: 's',
      default: 'RELEASE',
      desc: 'StageName of API gateway.'
    })
      .version(false)
      .help('help');
  }, (argv) => {
    require('../lib/commands/deploy')(argv.stage).catch(errHandle);
  })
  .help('help')
  .showHelpOnFail(true)
  .demandCommand(1, '')
  .usage('The fun tool use template.yml to describe the API Gateway & Function Compute things, then publish it online.\n\nUsage: $0 [--version] [--help] <command> [<args>]')
  .epilog(`See '$0 <command> --help' to read about a specific subcommand.`)
  .wrap(Math.min(80, yargs.terminalWidth()))
  .argv;