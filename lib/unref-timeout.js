'use strict';

function unrefTimeout(fn, timeout) {
  if (!timeout) { timeout = 1500; }

  const t = setTimeout(fn, timeout);

  t.unref();
}

const autoExit = (exitCode = 0) => {
  // fix not auto exit bug after docker operation
  unrefTimeout(() => {
    // in order visitor request has been sent out
    process.exit(exitCode); // eslint-disable-line
  });
};

module.exports = { unrefTimeout, autoExit };