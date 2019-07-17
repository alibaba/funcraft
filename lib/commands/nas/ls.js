'use strict';

async function ls(context) {
  
  var nasDir = context.nasDir;
  var allFlag = context.all;
  var listFlag = context.list;

  var splitNas = await require('../../nas/cp/pathResolver').splitNasPath(nasDir);
    
  var resolvedNasDir = splitNas.nasPath;
  var serviceName = splitNas.serviceName;

  await require('../../nas/ls/lsNasFile').ls(resolvedNasDir, allFlag, listFlag, serviceName);
}

module.exports = ls;
