'use strict';

async function ls(context) {
  
  var nasDir = context.nasDir;
  var allFlag = context.all;
  var listFlag = context.list;
  try {
    var splitNas = await require('../../nas/cp/path-support').splitNasPath(nasDir); 
  } catch (error) {
    console.log(error);
    return;
  }
    
  var resolvedNasDir = splitNas.nasPath;
  var serviceName = splitNas.serviceName;
  
  await require('../../nas/ls/ls-nas-file').ls(resolvedNasDir, allFlag, listFlag, serviceName);
}

module.exports = ls;
