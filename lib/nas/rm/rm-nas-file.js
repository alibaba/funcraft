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
  
  sendCmdReq(commonPath, cmd).then((rmContent) => {
    console.log(rmContent.data);
  }, (err) => {
    console.log('  rm err: ' + err);
  });
}

module.exports = { rm };