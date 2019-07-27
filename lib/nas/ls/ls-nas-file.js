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
  
  sendCmdReq(commonPath, cmd).then((lsContent) => {
    console.log(lsContent.data);
  }, (err) => {
    console.log('  ls err: ' + err);
  });
}

module.exports = { ls };