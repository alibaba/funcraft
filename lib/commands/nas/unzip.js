'use strict';
const parseNasPath = require('../../nas/cp/path-support').parseNasPath;
const unzipFile = require('../../nas/unzip/unzip-flie').unzip;
async function unzip(context) {
  
  const zipSrc = context.zipSrc;
  const neverFlag = context.never;
  const overwriteFlag = context.overwrite;
  const quietFlag = context.quiet;
  const exDir = context.exdir;

  try {
    var { nasPath, serviceName } = await parseNasPath(zipSrc);
  } catch (error) {
    console.log(error);
    return;
  }
    
  await unzipFile(nasPath, neverFlag, overwriteFlag, quietFlag, exDir, serviceName);
}

module.exports = unzip;
