'use strict';

const { yellow } = require('colors');

function showInitNextTips() {
  console.log(yellow(`\nTips for next step
======================
* Show NAS info            : fun nas info
* List NAS files           : fun nas ls
* Synchronize files to nas : fun nas sync
* Deploy Resources         : fun deploy`));
}

module.exports = {
  showInitNextTips
}