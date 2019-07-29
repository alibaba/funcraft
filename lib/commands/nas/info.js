'use strict';

const path = require('path');
const detectTplPath = require('../../tpl').detectTplPath;
const { red } = require('colors');

async function info(stage, tplPath) {

  if (!tplPath) {
    tplPath = await detectTplPath();
  }

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  } else if (path.basename(tplPath).startsWith('template')) {
    var infoMap = await require('../../nas/info/info-by-tpl').info(tplPath);
    infoMap.forEach(function(localNasDirs, serviceName, ownerMap) {
      console.log();
      console.log('Local NAS folder of service ' + serviceName + ' includes:');
      localNasDirs.forEach(function(localNas, mntDir, ownerSet) {
        console.log(localNas);
      });
    });
  } else {
    console.log('The template file name must be template.[yml|yaml] or faas.[yml|yaml] .');
  }
}

module.exports = info;
