'use strict';

const { yellow } = require('colors');

function showBuildNextTips() {
  const eventInvokeTip = 'fun local invoke';
  const httpInvokeTip = 'fun local start';
  const deployTip = 'fun deploy';

  console.log(yellow(`\nTips for next step
======================
* Invoke Event Function: ${eventInvokeTip}
* Invoke Http Function: ${httpInvokeTip}
* Deploy Resources: ${deployTip}`));
}

module.exports = {
  showBuildNextTips
};