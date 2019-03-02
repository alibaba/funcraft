'use strict';

const handler = function (err) {
  if (err.stack) {
    console.error(err.stack);
  } else {
    console.error(err);
  }
  process.exit(-1);
};

module.exports = handler;

