'use strict';
const debug = require('debug')('fun:nas:rm');
const sendCmdReq = require('../cp/http-request').sendCmdReq;
const getNasHttpTriggerPath = require('../cp/http-config').getNasHttpTriggerPath;
function generateRmCmd(nasPath, isRecursiveOpt, isForceOpt) {
  let cmd = 'rm ' + (isRecursiveOpt ? '-R ' : '') + (isForceOpt ? '-f ' : '') + nasPath;
  return cmd;
}
async function rm(nasPath, isRecursiveOpt, isForceOpt, serviceName) {
  
  let commonPath = await getNasHttpTriggerPath(serviceName);
  let cmd = generateRmCmd(nasPath, isRecursiveOpt, isForceOpt);
  
  debug(cmd);
  try {
    let rmContent = await sendCmdReq(commonPath, cmd);
    console.log(rmContent.data);
  } catch (error) {
    console.log('  rm err: ' + error);
  }
}

module.exports = { rm };