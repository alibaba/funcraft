'use strict';
const debug = require('debug')('fun:nas:unzip');
const { sendCmdReq } = require('../cp/http-request');

function generateUnzipCmd(resolvedNasZipFile, isNever, isOverwriteOpt, isQuietOpt, exDir) {
  var cmd = 'unzip ' + (isNever ? '-n ' : '') + (isOverwriteOpt ? '-o ' : '') + (isQuietOpt ? '-q ' : '') + resolvedNasZipFile;
  if (exDir !== undefined) {
    let resolvedExDir = require('../cp/path-support').parseNasPath(exDir);
    let nasExDir = resolvedExDir.nasPath;
    cmd = cmd + ' -d ' + nasExDir;
  }
  return cmd;
}
async function unzip(resolvedNasZipFile, isNever, isOverwriteOpt, isQuietOpt, exDir, serviceName) {
  let commonPath = await require('../cp/http-config').getNasHttpTriggerPath(serviceName);
  let cmd = generateUnzipCmd(resolvedNasZipFile, isNever, isOverwriteOpt, isQuietOpt, exDir);
  
  debug(cmd);
  try {
    let unzipContent = await sendCmdReq(commonPath, cmd);
    console.log(unzipContent.data);
  } catch (error) {
    console.log(`  unzip error : ${error}`);
  }
  
}

module.exports = { unzip };