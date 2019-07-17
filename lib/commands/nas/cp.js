'use strict';

const { resolveLocalPath, splitNasPath } = require('../../nas/cp/pathResolver');
const { getFcNasUrl } = require('../../nas/cp/nasConfig');


async function cp(context) {
  
  var srcPath = context.src;
  var dstPath = context.dst;
  var isDir = context.recurs;

  var localToNas;
  if (srcPath.indexOf('nas://') === 0 && dstPath.indexOf('nas://') !== 0) {
    localToNas = 0;
  } else if (srcPath.indexOf('nas://') !== 0 && dstPath.indexOf('nas://') === 0) {
    localToNas = 1;
  } else if (srcPath.indexOf('nas://') === 0 && dstPath.indexOf('nas://') === 0) {
    localToNas = -1;
  } else {
    localToNas = 2;
  }
  
  if (localToNas === 1) {
    var resolvedSrc = resolveLocalPath(srcPath);
    
    var splitNas = splitNasPath(dstPath);
    
    var resolvedDst = splitNas.nasPath;
    var serviceName = splitNas.serviceName;

    var nasFcUrl = await getFcNasUrl(serviceName);
    
    await require('../../nas/cp/upload').upload(resolvedSrc, resolvedDst, nasFcUrl, isDir);
  }
}

module.exports = cp;
