'use strict';
const exec = require('child_process').exec;

function execute(command, callback) {
  exec(command, function(error, stdout, stderr) { callback(stdout); });
}
module.exports = { execute };