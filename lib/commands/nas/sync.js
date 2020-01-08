'use strict';

const nasCp = require('../../nas/cp');
const nas = require('../../nas');
const path = require('path');
const validate = require('../../validate/validate');
const tips = require('../../nas/tips');

const { red } = require('colors');
const { toBeUmountedDirs, mergeNasMappingsInNasYml } = require('../../nas/support');
const { detectTplPath, getTpl, validateTplName, detectNasBaseDir, getBaseDir, getNasYmlPath } = require('../../tpl');

const _ = require('lodash');

async function sync(options) {
  const tplPath = await detectTplPath(false);

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  validateTplName(tplPath);

  await validate(tplPath);

  const tpl = await getTpl(tplPath);
  const baseDir = getBaseDir(tplPath);

  var service = options.service;
  var mountedDirs = options.mountDir;

  const nasBaseDir = detectNasBaseDir(tplPath);

  const nasMappingsIntpl = await nas.convertTplToServiceNasMappings(nasBaseDir, tpl);
  const serviceNasMappings = await mergeNasMappingsInNasYml(getNasYmlPath(tplPath), nasMappingsIntpl);

  if (service && mountedDirs) {
    const nasMappings = serviceNasMappings[service];
    const configuredMountDirs = _.map(nasMappings, (mapping) => mapping.remoteNasDir);
    const toUnmountDirs = toBeUmountedDirs(configuredMountDirs, mountedDirs);
    if (!_.isEmpty(toUnmountDirs)) { console.log(red(`Warning: ${toUnmountDirs} are not configured by service: ${service}`)); }
  }

  const localNasTmpDir = path.join(baseDir, '.fun', 'tmp', 'nas', 'sync');
  var errors = [];

  for (const serviceName in serviceNasMappings) {

    if (service && serviceName !== service) {
      continue;
    }
    for (const { localNasDir, remoteNasDir } of serviceNasMappings[serviceName]) {
      if (mountedDirs && !mountedDirs.includes(remoteNasDir)) { continue; }

      if (!localNasDir || !remoteNasDir) { continue; }
      const srcPath = localNasDir;

      const dstPath = `nas://${serviceName}${remoteNasDir}/`;

      console.log(`starting upload ${srcPath} to ${dstPath}`);
      try {
        await nasCp(srcPath, dstPath, true, false, localNasTmpDir, tpl, tplPath, baseDir, true);
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
