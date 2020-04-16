'use strict';

const debug = require('debug');
const { autoExit } = require('./unref-timeout');
const { red } = require('colors');
const { FilterChain } = require('./error-processor');

const filterChain = new FilterChain();

const handler = function (err) {
  // err may be null when fun local || fun build || fun install
  filterChain.process(err.message, err).then(processed => {
    // If the verbose option is true, in addition to the message,
    // print the stack of the error.
    if (debug.enabled('*') && err.stack) {
      console.error(err.stack);
    } else if (err) {
      console.error(err);
    } else {
      console.error(err);
    }

    process.exitCode = -1;

    autoExit(-1);
  });
};

module.exports = handler;

