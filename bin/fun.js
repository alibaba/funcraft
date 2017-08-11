#!/usr/bin/env node

'use strict';

const [subcommand, ...args] = process.argv.slice(2);

const usage = `
usage: fun [--version] [--help]
           <command> [<args>]

These are common Fun commands used in various situations:

start a working area
   deploy      Deploy a project to AliCloud
   build       Build the dependencies
   help        Print help information


'fun help -a' and 'fun help -g' list available subcommands and some
concept guides. See 'fun help <command>' or 'fun help <concept>'
to read about a specific subcommand or concept.
`;

if (!subcommand) {
  console.log(usage);
  process.exit(0);
}

console.log(subcommand);
console.log(...args);

var handle = function (err) {
  console.error(err.stack);
};

if (subcommand === 'deploy') {
  require('../lib/commands/deploy')(...args).catch(handle);
} else if (subcommand === 'build') {
  require('../lib/commands/build')(...args).catch(handle);
}
