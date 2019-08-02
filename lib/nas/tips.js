'use strict';

const { yellow } = require('colors');

function showInitNextTips() {
  console.log(yellow(`\nTips for next step
======================
$ fun nas info      # Show NAS info
$ fun nas ls        # List NAS files
$ fun nas sync      # Synchronize files to nas
$ fun deploy        # Deploy Resources`));
}

module.exports = {
  showInitNextTips
};