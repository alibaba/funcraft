'use strict';
const debug = require('debug')('fun:nas:unzip');
const { sendCmdReq } = require('../cp/http-request');

function generateUnzipCmd(resolvedNasZipFile, isNever, isOverwrite, isQuiet, exDir) {
  var cmd = 'unzip ' + (isNever ? '-n ' : '') + (isOverwrite ? '-o ' : '') + (isQuiet ? '-q ' : '') + resolvedNasZipFile;
  if (exDir !== undefined) {
    let resolvedExDir = require('../cp/path-support').parseNasPath(exDir);
    let nasExDir = resolvedExDir.nasPath;
    cmd = cmd + ' -d ' + nasExDir;
  }
  return cmd;
}
async function unzip(resolvedNasZipFile, isNever, isOverwrite, isQuiet, exDir, serviceName) {
  let commonPath = await require('../cp/http-config').getNasHttpTriggerPath(serviceName);
  let cmd = generateUnzipCmd(resolvedNasZipFile, isNever, isOverwrite, isQuiet, exDir);
  
  debug(cmd);
  
  sendCmdReq(commonPath, cmd).then((unzipContent) => {
    console.log(unzipContent.data);
  }, (err) => {
    console.log('an error has  occurred');
    debug('rm err: ' + err);
  });
}

module.exports = { unzip };