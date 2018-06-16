#!/usr/bin/env node

'use strict';
const argv = require('yargs').argv;

let subcommand = "build";
if (Array.isArray(argv._)) {
  subcommand = argv._[0]
}

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

var handle = function (err) {
  console.error(err.stack);
  process.exit(-1);
};

if (subcommand === 'deploy') {
  require('../lib/commands/deploy')(argv).catch(handle);
} else if (subcommand === 'build') {
  require('../lib/commands/build')(argv).catch(handle);
} else if (subcommand === '--version' || subcommand === '-v') {
  console.log(require('../package.json').version);
  process.exit(0);
} else {
  console.log('unsupported subcommand.');
  console.log('type: fun help');
  process.exit(-1);
}
