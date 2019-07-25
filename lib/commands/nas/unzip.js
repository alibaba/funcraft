'use strict';

async function unzip(context) {
  
  var zipSrc = context.zipSrc;
  var neverFlag = context.never;
  var overwriteFlag = context.overwrite;
  var quietFlag = context.quiet;
  var exDir = context.exdir;

  try {
    var splitNas = await require('../../nas/cp/path-support').splitNasPath(zipSrc);
  } catch (error) {
    console.log(error);
    return;
  }
  
  var resolvedNasZipFile = splitNas.nasPath;
  var serviceName = splitNas.serviceName;
  
  await require('../../nas/unzip/unzip-flie').unzip(resolvedNasZipFile, neverFlag, overwriteFlag, quietFlag, exDir, serviceName);
}

module.exports = unzip;
