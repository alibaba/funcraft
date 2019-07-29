'use strict';

const { resolveLocalPath, parseNasPath, isNasProtocol } = require('../../nas/cp/path-support');
const debug = require('debug')('fun:nas:cp');
const { isDirJudge, isFileJudge } = require('../../nas/cp/file-support');
const upload = require('../../nas/cp/upload').upload;
const getNasHttpTriggerPath = require('../../nas/cp/http-config').getNasHttpTriggerPath;
const nasCp = require('../../nas/cp/nas-cp').cp;
async function cp(context) {
  var srcPath = context.src;
  var dstPath = context.dst;
  var isRecursive = context.recursive;
  if (srcPath === undefined || dstPath === undefined) {
    console.log('Input path empty error, please input again!');
    return;
  }
  debug('cp ' + (isRecursive ? '-R ' : '') + srcPath + ' to ' + dstPath);

  if (isNasProtocol(srcPath) && !isNasProtocol(dstPath)) {
    //nas => local
    console.log('  Not support NAS file download now!');
    return;
  } else if (!isNasProtocol(srcPath) && isNasProtocol(dstPath)) {
    //local => nas
    try {
      
      if (await isDirJudge(srcPath) && !isRecursive) {
        console.log('Can not copy folder without option -R/--recursive');
        return;
      }
    } catch (err) {
      console.error(err);
      return;
    }
    try {
      
      if (await isFileJudge(srcPath) && isRecursive) {
        console.log('Can not copy file with option -R/--recursive');
        return;
      }
    } catch (err) {
      console.error(err);
      return;
    }

    var resolvedSrc = resolveLocalPath(srcPath);

    try {
      var { nasPath: resolvedDst, serviceName } = parseNasPath(dstPath);
    } catch (error) {
      console.log(error);
      return;
    }
    
    
    const commonPath = await getNasHttpTriggerPath(serviceName);
    
    upload(resolvedSrc, resolvedDst, commonPath, isRecursive);

  } else if (isNasProtocol(srcPath) && isNasProtocol(dstPath)) {
    //nas => nas
    try {
      var { nasPath: nasSrcPath, serviceName: srcServiceName } = parseNasPath(srcPath);
    } catch (error) {
      console.log(`nas src path error : ${error}`);
      return;
    }
    try {
      var { nasPath: nasDstPath, serviceName: dstServiceName } = parseNasPath(dstPath);
    } catch (error) {
      console.log(`nas dst path error : ${error}`);
      return;
    }
    
    

    if (srcServiceName !== dstServiceName) {
      console.log('  Src NAS service is different from Dst NAS service');
      return;
    }
    
    nasCp(nasSrcPath, nasDstPath, srcServiceName, isRecursive);
  } else {
    console.log('Format of path not support');
  }
  
}

module.exports = cp;
