'use strict';
const debug = require('debug')('fun:nas:unzip');
const { sendCmdReq } = require('../cp/http-request');

function generateUnzipCmd(resolvedNasZipFile, neverFlag, overwriteFlag, quietFlag, exDir) {
  var cmd = 'unzip ' + (neverFlag ? '-n ' : '') + (overwriteFlag ? '-o ' : '') + (quietFlag ? '-q ' : '') + resolvedNasZipFile;
  if (exDir !== undefined) {
    let resolvedExDir = require('../cp/path-support').splitNasPath(exDir);
    let nasExDir = resolvedExDir.nasPath;
    cmd = cmd + ' -d ' + nasExDir;
  }
  return cmd;
}
async function unzip(resolvedNasZipFile, neverFlag, overwriteFlag, quietFlag, exDir, serviceName) {
  let commonPath = await require('../cp/http-config').getCommonPath(serviceName);
  let cmd = generateUnzipCmd(resolvedNasZipFile, neverFlag, overwriteFlag, quietFlag, exDir);
  
  debug(cmd);
  
  sendCmdReq(commonPath, cmd).then((unzipContent) => {
    console.log(unzipContent.data);
  }, (err) => {
    console.log('an error has  occurred');
    debug('rm err: ' + err);
  });
}

module.exports = { unzip };