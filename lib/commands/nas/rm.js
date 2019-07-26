'use strict';
const parseNasPath = require('../../nas/cp/path-support').parseNasPath;
const rmNasFile = require('../../nas/rm/rm-nas-file').rm;
async function rm(context) {
  
  var nasTarget = context.nasTarget;
  var recursive = context.recursive;
  var force = context.force;
  
  try {
    var { nasPath, serviceName } = await parseNasPath(nasTarget);
  } catch (error) {
    console.log(error);
    return;
  }
  
  await rmNasFile(nasPath, recursive, force, serviceName);
}

module.exports = rm;
