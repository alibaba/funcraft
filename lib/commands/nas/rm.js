'use strict';

async function rm(context) {
  
  var nasTarget = context.nasTarget;
  var recurs = context.recurs;
  var force = context.force;
  
  try {
    var splitNas = await require('../../nas/cp/path-support').splitNasPath(nasTarget);
  } catch (error) {
    console.log(error);
    return;
  }
  
  var resolvedNasDir = splitNas.nasPath;
  var serviceName = splitNas.serviceName;
  
  await require('../../nas/rm/rm-nas-file').rm(resolvedNasDir, recurs, force, serviceName);
}

module.exports = rm;
