#!/usr/bin/env node

'use strict';

const handle = function (err) {
  console.error(err.stack);
  process.exit(-1);
};

const semver = require('semver')

if ( ! semver.satisfies(process.version, '>=8.0.0') ) {
  console.error('Error: require nodejs version >= 8.0.0');
  process.exit(1);
}

const program = require('commander');

program.version(require('../package.json').version, '-v, --version')
  .description('The fun tool use template.yml to describe the API Gateway & Function Compute things, then publish it online.');

program.command('config')
  .description('Configure the fun')
  .action(()=> {
    require('../lib/commands/config')().catch(handle);
  });

program.command('validate')
  .description('Validate a fun template')
  .option('-t, --template [template]', 'path of fun template file. defaults to \'template.{yaml|yml}\'', 'template.{yaml|yml}')
  .action((options)=>{
    require('../lib/commands/validate')(options.template).catch(handle);
  });

program.command('deploy')
  .description('Deploy a project to AliCloud')
  .action((stage)=> {
    require('../lib/commands/deploy')(stage).catch(handle);
  });

program.command('build')
  .description('Build the dependencies')
  .action(()=>{
    require('../lib/commands/build')().catch(handle);
  });

program.parse(process.argv);

if (!program.args.length) {program.help();}
