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

function showInstallNextTips() {
  const eventInvokeTip = 'fun local invoke';
  const httpInvokeTip = 'fun local start';
  const deployTip = 'fun deploy';
  const buildTip = 'fun build';

  console.log(yellow(`\nTips for next step
======================
* Invoke Event Function: ${eventInvokeTip}
* Invoke Http Function: ${httpInvokeTip}
* Build Http Function: ${buildTip}
* Deploy Resources: ${deployTip}`));
}

function showLocalStartNextTips(customDomains) {

  const startCommand = customDomains.map(cur => `fun local start ${cur}`);
  const debugCommand = customDomains.map(cur => `fun local start -d 3000 ${cur}`);

  const startTip = `${startCommand.join('\n* ')}`;
  const debugTip = `${debugCommand.join('\n* ')}`;

  console.log(yellow(`\nTips：you can also use these commands to run/debug custom domain resources:\n
Start with customDomain: \n* ${startTip}

Debug with customDomain: \n* ${debugTip}\n`));
}

module.exports = {
  showBuildNextTips, showInstallNextTips, showLocalStartNextTips
};