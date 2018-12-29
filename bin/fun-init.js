#!/usr/bin/env node

/* eslint-disable quotes */

'use strict';

const program = require('commander');

const examples =
  `
  Examples:

    $ fun init
    $ fun init helloworld-nodejs8
    $ fun init foo/bar
    $ fun init gh:foo/bar
    $ fun init gl:foo/bar
    $ fun init bb:foo/bar
    $ fun init github:foo/bar
    $ fun init gitlab:foo/bar
    $ fun init bitbucket:foo/bar
    $ fun init git+ssh://git@github.com/foo/bar.git
    $ fun init hg+ssh://hg@bitbucket.org/bar/foo
    $ fun init git@github.com:foo/bar.git
    $ fun init https://github.com/foo/bar.git
    $ fun init /path/foo/bar
    $ fun init -n fun-app -V foo=bar /path/foo/bar
  `;

const parseVars = (val, vars) => {
  /*
   * Key-value pairs, separated by equal signs
   * keys can only contain letters, numbers, and underscores
   * values can be any character
   */
  const group = val.match(/(^[a-zA-Z_][a-zA-Z\d_]*)=(.*)/);
  vars = vars || {};
  if (group) {
    vars[group[1]] = group[2];
  }
  return vars;
};

program
  .name('fun init')
  .usage('[options] [location]')
  .description('Initializes a new fun project.')
  .option('-o, --output-dir [path]', 'where to output the initialized app into', '.')
  .option('-n, --name [name]', 'name of your project to be generated as a folder', '')
  .option('-m, --merge [merge]', 'merge into the template.[yml|yaml] file if it already exist', false)
  .option('--no-input', 'disable prompting and accept default values defined template config')
  .option('-V, --var [vars]', 'template variable', parseVars)
  .on('--help', () => {
    console.log(examples);
  })
  .parse(process.argv);

const context = {
  name: program.name,
  outputDir: program.outputDir,
  merge: program.merge,
  input: program.input,
  vars: program.var || {}
};

if (program.args.length > 0) {
  context.location = program.args[0];
}

require('../lib/commands/init')(context).catch(require('../lib/exception-handler'));
