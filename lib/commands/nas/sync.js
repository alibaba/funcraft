'use strict';

const { detectTplPath, getTpl } = require('../../tpl');
const cp = require('../../nas/cp');
const nas = require('../../nas');
const path = require('path');
const validate = require('../../validate/validate');
const { red } = require('colors');
const tips = require('../../nas/tips');
const { deployNasService } = require('../../nas/init');
const _ = require('lodash');

async function sync(options) {
  const tplPath = await detectTplPath(false);

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  } else if (path.basename(tplPath).startsWith('template')) {

    await validate(tplPath);

    const tpl = await getTpl(tplPath);
    const baseDir = path.dirname(tplPath);

    var service = options.service;
    var mntDirs = options.mountDir;
    
    const serviceNasMappings = await nas.convertTplToServiceNasMappings(baseDir, tpl);
    var errors = [];
    for (const serviceName in serviceNasMappings) {

      if (service && serviceName !== service) {
        continue; 
      } else if (service && serviceName === service) {
        //对 service 进行 fun nas init 操作
        await deployNasService(baseDir, tpl, service);
      }

      for (const { localNasDir, remoteNasDir } of serviceNasMappings[serviceName]) {

        if (mntDirs && !mntDirs.includes(remoteNasDir)) { continue; }

        const srcPath = localNasDir;

        const dstPath = `nas://${serviceName}:${remoteNasDir}/`;

        console.log(`Starting upload ${srcPath} to ${dstPath}`);
        try {
          await cp(srcPath, dstPath, true);
        } catch (error) {
          errors.push(`Upload ${srcPath} To ${dstPath} ${error}`);
        }
        
      }
    }
    if (errors.length) {
      console.log();
      _.forEach(errors, (error) => {
        console.log(red(error));
      });
    }
    tips.showInitNextTips();
  } else {
    throw new Error(red('The template file name must be template.[yml|yaml].'));
  }
}

module.exports = sync;
