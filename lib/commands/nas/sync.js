'use strict';

const { detectTplPath, getTpl, validateYmlName, detectProjectRoot } = require('../../tpl');
const cp = require('../../nas/cp');
const nas = require('../../nas');
const path = require('path');
const validate = require('../../validate/validate');
const { red } = require('colors');
const tips = require('../../nas/tips');
const { deployNasService } = require('../../nas/init');
const { toBeUmountedDirs } = require('../../nas/support');
const { DEFAULT_NAS_PATH_SUFFIX } = require('../../tpl');
const _ = require('lodash');

async function sync(options) {
  const tplPath = await detectTplPath(false);

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  validateYmlName(tplPath);
  
  await validate(tplPath);

  const tpl = await getTpl(tplPath);
  const baseDir = path.dirname(tplPath);

  var service = options.service;
  var mountedDirs = options.mountDir;

  const projectRoot = detectProjectRoot(tplPath);
  const nasBaseDir = path.join(projectRoot, DEFAULT_NAS_PATH_SUFFIX);

  const serviceNasMappings = await nas.convertTplToServiceNasMappings(nasBaseDir, tpl);
  
  if (service) {
    const nasMappings = serviceNasMappings[service];
    const configuredMountDirs = _.map(nasMappings, (mapping) => mapping.remoteNasDir);
    const toUnmountDirs = toBeUmountedDirs(configuredMountDirs, mountedDirs);
    if (!_.isEmpty(toUnmountDirs)) { console.log(red(`Warning: ${toUnmountDirs} are not configured by service: ${service}`)); }
  }
  
  const serviceNasIdMappings = nas.convertTplToServiceNasIdMappings(tpl);

  const localNasTmpDir = path.join(baseDir, '.fun', 'tmp', 'nas', 'sync');
  var errors = [];
  for (const serviceName in serviceNasMappings) {

    if (service && serviceName !== service) {
      continue; 
    }
    
    //对 service 进行 fun nas init 操作
    await deployNasService(baseDir, tpl, service);
    const nasId = serviceNasIdMappings[serviceName];
    
    for (const { localNasDir, remoteNasDir } of serviceNasMappings[serviceName]) {

      if (mountedDirs && !mountedDirs.includes(remoteNasDir)) { continue; }

      const srcPath = localNasDir;

      const dstPath = `nas://${serviceName}${remoteNasDir}/`;

      console.log(`starting upload ${srcPath} to ${dstPath}`);
      try {
        await cp(srcPath, dstPath, true, localNasTmpDir, nasId);
      } catch (error) {
        errors.push(`Upload ${srcPath} To ${dstPath} ${error}`);
      }
      
    }
  }
  if (errors.length) {
    console.log();
    _.forEach(errors, (error) => {
      console.log(red(`${error}\n`));
    });
  }
  tips.showInitNextTips();
}

module.exports = sync;
