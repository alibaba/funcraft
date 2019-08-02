'use strict';
const exec = require('child_process').exec;

function execute(command) {
  return new Promise((resolve, reject) => {
    exec(command, {
      encoding: 'utf8',
      timeout: 0,
      maxBuffer: 1024 * 1024 * 1024, 
      killSignal: 'SIGTERM'
    }, (error, stdout, stderr) => {
      
      if (error) { reject(error); }
      
      resolve({
        stdout,
        stderr
      });
    });
  });
}

module.exports = execute;