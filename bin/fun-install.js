#!/usr/bin/env node

'use strict';

const handler = require('../lib/exception-handler');
const _ = require('lodash');
const Command = require('commander').Command;
const program = new Command('fun install');
const { install, installAll, init, env } = require('../lib/commands/install');

const optDefaults = {
  packageType: 'module'
};

program
  .usage('[moduleNames...]')
  .option('-r, --runtime <runtime>', 'function runtime, avaliable choice is: python2.7, python3, nodejs6, nodejs8, java8, php7.2')
  .option('--save', 'add module to fun.yml file.')
  .option('-R, --recursive', 'recursive install fun.yml in subdirectory.')
  .option('-p, --package-type <type>', 'avaliable package type option: pip, apt.')
  .option('-e, --env [env]', 'environment variable, ex. -e PATH=/code/bin', (e, envs) => (envs.push(e), envs), [])
  .arguments('[packageNames...]')
  .description('install dependencies which are described in fun.yml file.')
  .action(async (packageNames, program) => {
    // convert long option to camelCase variable name,such as '--package-type' to 'packageType'
    const optionNames = _.map(program.options, (opt) => _.camelCase(opt.long));
    // pick the option properties into a new object.
    const options = _.pickBy(program, (_val, name) => _.includes(optionNames, name));
    // merge options default values.
    const opts = Object.assign({
      codeUri: process.cwd(),
      local: true
    }, optDefaults, options);

    if (opts.recursive){
      console.error('--recursive option can only be used without arguments.');
    }

    opts.verbose = parseInt(process.env.FUN_VERBOSE) > 0;

    // [ 'A=B', 'B=C' ] => { A: 'B', B: 'C' }
    opts.env = (options.env || []).map( e => _.split(e, '=', 2))
      .filter( e => e.length === 2 )
      .reduce((acc, cur) => (acc[cur[0]] = cur[1], acc), {});

    install(packageNames, opts).catch(handler);
  });

program
  .command('init')
  .description('initialize fun.yml file.')
  .action(init);

program
  .command('env')
  .description('print environment varables.')
  .action(env);
  
program.parse(process.argv);
  
if (!program.args.length) {
  installAll(process.cwd(), {
    recursive: program.recursive,
    verbose: parseInt(process.env.FUN_VERBOSE) > 0
  }).catch(handler);
}