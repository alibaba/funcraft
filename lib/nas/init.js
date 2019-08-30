'use strict';

const fs = require('fs-extra');
const path = require('path');

const { getProfile, mark } = require('../profile');

const { deployService } = require('../deploy/deploy-by-tpl');
const definition = require('../definition');
const constants = require('./constants');
const { green } = require('colors');
const tips = require('./tips');
const nas = require('../nas');
const _ = require('lodash');
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
    _.forEach(nasMappings, (mappings) => {
      console.log(`\t${mappings.localNasDir}`);
    });
  }

  console.log();
  console.log(green('Fun nas init Success'));
  if (!service) { tips.showInitNextTips(); }
}

module.exports = { deployNasService };