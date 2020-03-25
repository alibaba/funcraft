'use strict';

const _ = require('lodash');
const path = require('path');
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

function showTipsForNasYml(baseDir, serviceNasMappings) {
  if (_.isEmpty(serviceNasMappings)) { return; }

  const localNasDir = [];
  _.forEach(serviceNasMappings, (nasMappings, key) => {
    for (const nasMapping of nasMappings) {
      localNasDir.push(path.resolve(baseDir, nasMapping.localNasDir));
    }
  });
  console.log(yellow(`
===================================== Tips for nas resources ==================================================
Fun has detected the .nas.yml file in your working directory, which contains the local directory:

        ${localNasDir.join('\n\t')}
  `));
  console.log(yellow(`The above directories will be automatically ignored when 'fun deploy'.
Any content of the above directories changes，you need to use 'fun nas sync' to sync local resources to remote.
===============================================================================================================`));
}

function showPackageNextTips(packedYmlPath) {
  const deployTip = 'fun deploy';

  const relative = path.relative(process.cwd(), packedYmlPath);
  const DEFAULT_PACKAGED_YAML_NAME = 'template.packaged.yml';

  let templateParam = '';
  if (relative !== DEFAULT_PACKAGED_YAML_NAME) {
    templateParam = ` -t ${relative}`;
  }

  console.log(yellow(`\nTips for next step
======================
* Deploy Resources: ${deployTip}${templateParam}`));
}

module.exports = {
  showTipsForNasYml,
  showBuildNextTips,
  showInstallNextTips,
  showPackageNextTips,
  showLocalStartNextTips
};