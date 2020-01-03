'use strict';

const debug = require('debug');
const unrefTimeout = require('./unref-timeout');
const { red } = require('colors');
const { FilterChain } = require('./error-processor');

const filterChain = new FilterChain();

const handler = function (err) {
  filterChain.process(err.message, err).then(processed => {
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
  });
};

module.exports = handler;

