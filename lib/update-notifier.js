'use strict';

const notifier = require('update-notifier');
const pkg = require('../package.json');


function notify(updateCheckInterval = 1000 * 60 * 60 * 2) { // default 2 hour
  notifier({
    pkg,
    updateCheckInterval 
  }).notify();
}

module.exports = { notify };