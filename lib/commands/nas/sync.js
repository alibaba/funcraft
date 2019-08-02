'use strict';

const { detectTplPath, getTpl } = require('../../tpl');
const cp = require('../../nas/cp');
const nas = require('../../nas');
const path = require('path');
const validate = require('../../validate/validate');
const { red } = require('colors');

async function sync(options) {
  const tplPath = await detectTplPath();

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  } else if (path.basename(tplPath).startsWith('template')) {

    await validate(tplPath);

    const tpl = await getTpl(tplPath);
    const baseDir = path.dirname(tplPath);

    var service = options.service;
    var mntDirs = options.mntdir;
    
    const serviceNasMappings = await nas.convertTplToServiceNasMappings(baseDir, tpl);

    for (const serviceName in serviceNasMappings) {

      if (service && serviceName !== service) { continue; }

      for (const { localNasDir, remoteNasDir } of serviceNasMappings[serviceName]) {

        if (mntDirs && !mntDirs.includes(remoteNasDir)) { continue; }

        const srcPath = localNasDir;

        const dstPath = `nas://${serviceName}:${remoteNasDir}/`;

        console.log(`Starting upload ${srcPath} to ${dstPath}`);

        await cp(srcPath, dstPath, true);
      }
    }
  } else {
    throw new Error(red('The template file name must be template.[yml|yaml].'));
  }
}

module.exports = sync;
