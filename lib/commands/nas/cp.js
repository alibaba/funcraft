'use strict';

const { resolveLocalPath, splitNasPath, isNasPath } = require('../../nas/cp/path-support');
const debug = require('debug')('fun:nas:cp');
const { isDir, isFile } = require('../../nas/cp/fie-support');


async function cp(context) {
  
  var srcPath = context.src;
  var dstPath = context.dst;
  var dirFlag = context.recurs;
  
  debug('cp ' + (dirFlag ? '-R ' : '') + srcPath + ' to ' + dstPath);

  if (isNasPath(srcPath) && !isNasPath(dstPath)) {
    //nas => local
  } else if (!isNasPath(srcPath) && isNasPath(dstPath)) {
    //local => nas
    try {
      let srcDirFlag = await isDir(srcPath);
      
      if (srcDirFlag && !dirFlag) {
        console.log('Can not copy folder without option -R/--recursive');
        return;
      }
    } catch (err) {
      console.error(err);
      return;
    }
    try {
      let srcFileFlag = await isFile(srcPath);
      if (srcFileFlag && dirFlag) {
        console.log('Can not copy file with option -R/--recursive');
        return;
      }
    } catch (err) {
      console.error(err);
      return;
    }

    var resolvedSrc = resolveLocalPath(srcPath);
    
    var splitNas = splitNasPath(dstPath);
    
    var resolvedDst = splitNas.nasPath;
    var serviceName = splitNas.serviceName;

    
    let commonPath = await require('../../nas/cp/http-config').getCommonPath(serviceName);
    
    require('../../nas/cp/upload').upload(resolvedSrc, resolvedDst, commonPath, dirFlag);

  } else if (isNasPath(srcPath) && isNasPath(dstPath)) {
    //nas => nas
    
    let splitNasSrc = splitNasPath(srcPath);
    let splitNasDst = splitNasPath(dstPath);

    if (splitNasSrc.serviceName !== splitNasDst.serviceName) {
      console.log('src service and dst service is not equal');
      return;
    }
    let nasSrcPath = splitNasSrc.nasPath;
    let nasDstPath = splitNasDst.nasPath;
    
    require('../../nas/cp/nas-cp').cp(nasSrcPath, nasDstPath, serviceName, dirFlag);
  } else {
    console.log('Format of path not support');
  }
  
}

module.exports = cp;
