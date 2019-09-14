'use strict';

const debug = require('debug');
const unrefTimeout = require('./unref-timeout');
const { red } = require('colors');

const handler = function (err) {
  // If the verbose option is true, in addition to the message,
  // print the stack of the error.
  if (debug.enabled('*') && err.stack) {
    console.error(err.stack);
  } else if (err.message) {
    console.error(red(err.message));
  } else {
    console.error(err);
  }

  // in order visitor request has been sent out
  
  unrefTimeout(() => {
    process.exit(-1); // eslint-disable-line
  });
};

module.exports = handler;

