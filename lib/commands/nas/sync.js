'use strict'; 

const detectTplPath = require('../../tpl').detectTplPath;
const infoByTpl = require('../../nas/info/info-by-tpl').info;
const cp = require('./cp');

async function sync(context) {
  let tplPath = await detectTplPath();
  if (tplPath === undefined) {
    console.log('No template.yml in current directory');
    return;
  }
  
  var serviceName = context.service;
  var mntDirs = context.mntdir;
  
  if (serviceName === undefined && mntDirs !== undefined) {
    console.log('Lake of service name');
    return;
  }
  
  let serviceLocalNas = await infoByTpl(tplPath);

  if (serviceName !== undefined) {
    let localNas = serviceLocalNas.get(serviceName);
    if (mntDirs !== undefined) {
      localNas.forEach(function (localNasDir, mntDir, ownerMap) {
        
        if (mntDirs.includes(mntDir)) {
          let srcPath = localNasDir;
          if ( srcPath.lastIndexOf('/') !== srcPath.length - 1) {
            srcPath = srcPath + '/';
          }
          let dstPath = `nas://${serviceName}:/${mntDir}`;
          
          const cp_context = {
            src: srcPath,
            dst: dstPath,
            recursive: true
          };
          cp(cp_context);
        }
        
      });
    } 
    else {
      localNas.forEach(function (localNasDir, mntDir, ownerMap) {
        let srcPath = localNasDir;
        let dstPath = `nas://${serviceName}:/${mntDir}`;
        
        const cp_context = {
          src: srcPath,
          dst: dstPath,
          recursive: true
        };
        cp(cp_context);
      });
    }
  }
  else {
    serviceLocalNas.forEach(function (localNasValue, serviceNameKey, ownerMap) {
      localNasValue.forEach(function (localNasDir, mntDir, ownerMap) {
        let srcPath = localNasDir;
        
        let dstPath = `nas://${serviceNameKey}:/${mntDir}`;
        
        const cp_context = {
          src: srcPath,
          dst: dstPath,
          recursive: true
        };
        cp(cp_context);
      });
    });
  }
}

module.exports = sync;
