'use strict';

const fs = require('fs-extra');
const path = require('path');

const { getProfile, mark } = require('../profile');
const { deployService } = require('../deploy/deploy-by-tpl');
const definition = require('../definition');
const constants = require('./constants');
const { green, red } = require('colors');
const tips = require('./tips');
const nas = require('../nas');
const { statsRequest, getNasHttpTriggerPath } = require('./request');
const { checkWritePerm } = require('./support');

async function deployNasService(baseDir, tpl, service) {
  const profile = await getProfile();

  console.log(`using region: ${profile.defaultRegion}`);
  console.log(`using accountId: ${mark(profile.accountId)}`);
  console.log(`using accessKeyId: ${mark(profile.accessKeyId)}`);
  console.log(`using timeout: ${profile.timeout}`);

  console.log('');

  console.log('start fun nas init...');

  const zipCodePath = path.resolve(__dirname, '../utils/fun-nas-server/dist/fun-nas-server.zip');

  if (!await fs.pathExists(zipCodePath)) {
    throw new Error('could not find ../utils/fun-nas-server/dist/fun-nas-server.zip');
  }

  for (const { serviceName, serviceRes } of definition.findServices(tpl.Resources)) {

    if (service && service !== serviceName) { continue; }

    const serviceProps = (serviceRes || {}).Properties;
    const nasConfig = (serviceProps || {}).NasConfig;
    const vpcConfig = (serviceProps || {}).VpcConfig;

    if (!nasConfig) {
      continue;
    }
    
    const nasServiceName = constants.FUN_NAS_SERVICE_PREFIX + serviceName;
 
    const nasServiceRes = {
      'Type': 'Aliyun::Serverless::Service',
      'Properties': {
        'Description': `service for fc nas used for service ${serviceName}`,
        'VpcConfig': vpcConfig,
        'NasConfig': nasConfig
      },
      [constants.FUN_NAS_FUNCTION]: {
        Type: 'Aliyun::Serverless::Function',
        Properties: {
          Handler: 'index.handler',
          Runtime: 'nodejs10',
          CodeUri: zipCodePath,
          Timeout: 600,
          MemorySize: 256, 
          EnvironmentVariables: {
            PATH: '/code/.fun/root/usr/bin'
          }
        },
        Events: {
          httpTrigger: {
            Type: 'HTTP',
            Properties: {
              AuthType: 'FUNCTION',
              Methods: ['POST', 'GET']
            }
          }
        }
      }
    };

    console.log(`Waiting for service ${nasServiceName} to be deployed...`);
    await deployService(baseDir, nasServiceName, nasServiceRes);
    console.log(green(`service ${nasServiceName} deploy success\n`));


    const nasMappings = await nas.convertNasConfigToNasMappings(baseDir, nasConfig, serviceName);
    console.log(green(`Create local NAS directory of service ${serviceName}:`));
    const nasId = nas.getNasIdFromNasConfig(nasConfig);
    const nasHttpTriggerPath = await getNasHttpTriggerPath(serviceName);
    let permTipArr = [];
    for (let mappings of nasMappings) {
      console.log(`\t${mappings.localNasDir}`);
      // TO DO ：检查 NasConfig 中的 UserId 和 GroupId 是否与远端一致
      const statsRes = await statsRequest(mappings.remoteNasDir, nasHttpTriggerPath);
      const stats = statsRes.data;
      const permTip = checkWritePerm(stats, nasId, mappings.remoteNasDir);
      if (permTip) {
        permTipArr.push(permTip);
      }
    }
    for (let permTip of permTipArr) {
      console.log(red(`\nWarning: fun nas init: ${permTip}`));
    }
  }

  console.log(green('\nFun nas init Success'));
  if (!service) { tips.showInitNextTips(); }
}

module.exports = { deployNasService };