'use strict';
const exec = require('child_process').exec;

function execute(command, callback) {
 //console.log('-----' + process.env.PATH);
  exec(command, {
    encoding: 'utf8',
    timeout: 0,
    maxBuffer: 1024 * 1024 * 1024, 
    killSignal: 'SIGTERM'
  }, function (error, stdout, stderr) {
    if (stdout) {
      callback(stdout);
    } else if(stderr) {
      callback(stderr);
    } else {
      callback(error);
    }
  });
}
module.exports = { execute };