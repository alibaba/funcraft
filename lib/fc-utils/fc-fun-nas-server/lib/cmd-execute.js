'use strict';
const exec = require('child_process').exec;

function execute(command, callback) {
  exec(command, {
    encoding: 'utf8',
    timeout: 0,
    maxBuffer: 1024 * 1024 * 1024, 
    killSignal: 'SIGTERM'
  }, function (error, stdout, stderr) {
    if (stdout) {
      return callback(stdout);
    } else if (stderr) {
      return callback(stderr);
    } 
    return callback(error);
  });
}

module.exports = { execute };