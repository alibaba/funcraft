'use strict';

const process = require("child_process");

function exec(cmd) {
  return new Promise((resolve, reject) => {
    console.log(`Executing command '${cmd}'...`)
    process.exec(cmd, (error, stdout, stderr) => {
      console.log(stdout);

      if (error) {
        console.error(stderr);

        reject(error);
        return ;
      }

      resolve();
    });
  });
}

module.exports = {
  exec
}