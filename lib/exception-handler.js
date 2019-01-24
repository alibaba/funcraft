'use strict';

const debug = require('debug');

const handler = function (err) {
  // If the verbose option is true, in addition to the message,
  // print the stack of the error.
  if (debug.enabled('*') && err.stack) {
    console.error(err.stack);
  } else {
    console.error(err.message);
  }
  process.exit(-1);
};

module.exports = handler;

