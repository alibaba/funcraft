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

  // in order visitor request has been sent out
  
  setTimeout(() => {
    process.exit(-1); // eslint-disable-line
  }, 1000);
};

module.exports = handler;

