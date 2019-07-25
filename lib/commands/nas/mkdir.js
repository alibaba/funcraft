'use strict';

async function mkdir(context) {
  
  let verbose = context.verbose;
  let mode = context.mode;
  let parents = context.parents;
  let nasDir = context.nasDir;
  try {
    var splitNas = await require('../../nas/cp/path-support').splitNasPath(nasDir);
  } catch (error) {
    console.log(error);
    return;
  }
  
  var resolvedNasDir = splitNas.nasPath;
  var serviceName = splitNas.serviceName;
  
  await require('../../nas/mkdir/make-nas-dir').mkdir(resolvedNasDir, verbose, mode, parents, serviceName);
}

module.exports = mkdir;
