'use strict';

const notifier = require('update-notifier');
const pkg = require('../package.json');
const FUN_DISABLE_VERSION_CHECK = 'FUN_DISABLE_VERSION_CHECK';

function notify(updateCheckInterval = 1000 * 60 * 60 * 2) { // default 2 hour
  const disableVersionCheck = process.env[FUN_DISABLE_VERSION_CHECK];
  if (
    disableVersionCheck !== undefined &&
    disableVersionCheck !== '0' &&
    disableVersionCheck !== 'false'
  ) {
    return;
  }
  notifier({
    pkg,
    updateCheckInterval 
  }).notify();
}

module.exports = { notify };