'use strict';

const fs = require('fs-extra');
const path = require('path');

const { deployService } = require('../deploy/deploy-by-tpl');
const definition = require('../definition');
const constants = require('./constants');
const { green, red } = require('colors');
const nas = require('../nas');
const { statsRequest, getNasHttpTriggerPath } = require('./request');
const { checkWritePerm, isNasServerStale } = require('./support');
const { sleep } = require('../time');

async function deployNasService(baseDir, tpl, service) {

  console.log('\nstart fun nas init...');

  const zipCodePath = path.resolve(__dirname, '../utils/fun-nas-server/dist/fun-nas-server.zip');
  
  if (!await fs.pathExists(zipCodePath)) {
    throw new Error('could not find ../utils/fun-nas-server/dist/fun-nas-server.zip');
  }
  const versionFilePath = path.resolve(__dirname, '../utils/fun-nas-server/dist/VERSION');
  if (!await fs.pathExists(versionFilePath)) {
    throw new Error('could not find ../utils/fun-nas-server/dist/VERSION');
  }
  const version = (await fs.readFile(versionFilePath)).toString();
  let permTipArr = [];
  for (const { serviceName, serviceRes } of definition.findServices(tpl.Resources)) {

    if (service && service !== serviceName) { continue; }

    const serviceProps = (serviceRes || {}).Properties;
    const nasConfig = (serviceProps || {}).NasConfig;
    const vpcConfig = (serviceProps || {}).VpcConfig;

    if (!nasConfig) {
      continue;
    }
    
    const nasServiceName = constants.FUN_NAS_SERVICE_PREFIX + serviceName;
    console.log(`checking if ${nasServiceName} needs to be deployed...`);
    if (await isNasServerStale(nasServiceName, nasConfig, version)) {
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
  
  
      const nasMappings = await nas.convertNasConfigToNasMappings(nas.getDefaultNasDir(baseDir), nasConfig, serviceName);
      console.log(green(`Create local NAS directory of service ${serviceName}:`));
      
      const nasId = nas.getNasIdFromNasConfig(nasConfig);
      const nasHttpTriggerPath = getNasHttpTriggerPath(serviceName);
      // 延迟 1 秒，为保证 nas server 部署完成并成功执行
      // TODO: 利用类似部署 ID 的标识来验证部署的的成功
      await sleep(1000);
      
      for (let mappings of nasMappings) {
        console.log(`\t${mappings.localNasDir}`);
        
        const statsRes = await statsRequest(mappings.remoteNasDir, nasHttpTriggerPath);
        const stats = statsRes.data;
        const permTip = checkWritePerm(stats, nasId, mappings.remoteNasDir);
        if (permTip) {
          permTipArr.push(permTip);
        }
      }
    } else {
      console.log(`skip deploying ${nasServiceName}, which has been deployed`);
    }
   
  }
  for (let permTip of permTipArr) {
    console.log(red(`\nWarning: fun nas init: ${permTip}`));
  }

  console.log(green('fun nas init Success\n'));
}

module.exports = { deployNasService };