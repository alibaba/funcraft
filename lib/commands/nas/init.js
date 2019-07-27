'use strict';

const detectTplPath = require('../../tpl').detectTplPath;
const fs = require('fs'); 
const mkdirp = require('mkdirp');
const deployNasFunction = require('../../nas/init/fun-nas-command-deploy-by-tpl').deployNasFunction;
const info = require('../../nas/info/info-by-tpl').info;
async function init() {
  let tplPath = await detectTplPath();
  if (typeof tplPath === undefined) {
    console.log('No template.yml in current directory');
    return;
  } 

  const serviceLocalNas = await info(tplPath);

  serviceLocalNas.forEach(function(localNasValue, serviceNameKey, ownerMap) {
    localNasValue.forEach(function(localNasDir, mntDir, ownerMap) {
      if (fs.existsSync(localNasDir) && fs.statSync(localNasDir).isDirectory()) {
        console.log(localNasDir + ' already exists');
      } else {
        mkdirp(localNasDir, (err) => {
          if (err) {
            throw err;
          } else {
            console.log(localNasDir + ' directory creates successfully');
          }
        });
      }
    });
  });
  
  
  await deployNasFunction(tplPath);
}

module.exports = init;
