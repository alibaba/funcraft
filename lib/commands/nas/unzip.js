'use strict';
const parseNasPath = require('../../nas/cp/path-support').parseNasPath;
const unzipFile = require('../../nas/unzip/unzip-flie').unzip;
async function unzip(context) {
  
  var zipSrc = context.zipSrc;
  var neverFlag = context.never;
  var overwriteFlag = context.overwrite;
  var quietFlag = context.quiet;
  var exDir = context.exdir;

  try {
    var { nasPath, serviceName } = await parseNasPath(zipSrc);
  } catch (error) {
    console.log(error);
    return;
  }
    
  await unzipFile(nasPath, neverFlag, overwriteFlag, quietFlag, exDir, serviceName);
}

module.exports = unzip;
