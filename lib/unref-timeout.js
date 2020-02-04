'use strict';

function unrefTimeout(fn, timeout) {
  if (!timeout) { timeout = 1500; }

  const t = setTimeout(fn, timeout);

  t.unref();
}

const autoExit = () => {
  // fix not auto exit bug after docker operation
  unrefTimeout(() => {
    // in order visitor request has been sent out
    process.exit(0); // eslint-disable-line
  });
};

module.exports = { unrefTimeout, autoExit };