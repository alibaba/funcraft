'use strict';

const _ = require('lodash');

function registerCommandChecker(program) {
  // Print help information if commands or alias are unknown.
  program.on('command:*', (cmds) => {
    if (!_.flatMap(program.commands, (command) => {
      return [command.name(), command.alias()];
    }).includes(cmds[0])) {
      console.error();
      console.error('  error: unknown command \'%s\'', cmds[0]);
      program.help();
    }
  });
}

module.exports = { registerCommandChecker };