'use strict';
const debug = require('debug')('fun:nas:ls');
const sendCmdReq = require('../cp/http-request').sendCmdReq;
const getNasHttpTriggerPath = require('../cp/http-config').getNasHttpTriggerPath;
function generateLsCmd(nasPath, allFlag, listFlag) {
  let cmd = 'ls ' + (allFlag ? '-a ' : '') + (listFlag ? '-l ' : '') + nasPath;
  return cmd;
}
async function ls(nasPath, allFlag, listFlag, serviceName) {
  
  let commonPath = await getNasHttpTriggerPath(serviceName);
  
  let cmd = generateLsCmd(nasPath, allFlag, listFlag);
  
  
  sendCmdReq(commonPath, cmd).then((lsContent) => {
    console.log(lsContent.data);
  }, (err) => {
    console.log('  ls err: ' + err);
    debug('ls err: ' + err);
  });
}

module.exports = { ls };