'use strict';
const debug = require('debug')('fun:nas:ls');
const sendCmdReq = require('../cp/http-request').sendCmdReq;
const getNasHttpTriggerPath = require('../cp/http-config').getNasHttpTriggerPath;
function generateLsCmd(nasPath, isAllOpt, isListOpt) {
  let cmd = 'ls ' + (isAllOpt ? '-a ' : '') + (isListOpt ? '-l ' : '') + nasPath;
  return cmd;
}
async function ls(nasPath, isAllOpt, isListOpt, serviceName) {
  
  let commonPath = await getNasHttpTriggerPath(serviceName);
  
  let cmd = generateLsCmd(nasPath, isAllOpt, isListOpt);
  
  debug(cmd);
  try {
    let lsContent = await sendCmdReq(commonPath, cmd);
    console.log(lsContent.data);
  } catch (error) {
    console.log('  ls err: ' + error);
  }
}

module.exports = { ls };