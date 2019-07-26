'use strict';
const debug = require('debug')('fun:nas:nascp');
const { sendCmdReq } = require('../cp/http-request');
const getNasHttpTriggerPath = require('./http-config').getNasHttpTriggerPath;
function generatecpCmd(srcPath, dstPath, dirFlag) {
  let cmd = 'cp ' + (dirFlag ? '-R ' : '') + srcPath + ' ' + dstPath;
  
  return cmd;
}
async function cp(srcPath, dstPath, serviceName, dirFlag) {
  
  let commonPath = await getNasHttpTriggerPath(serviceName);
  let cmd = generatecpCmd(srcPath, dstPath, dirFlag);

  debug(cmd);
  
  sendCmdReq(commonPath, cmd).then((cpContent) => {
    console.log(cpContent.data);
  }, (err) => {
    console.log('   cp err ' + err);
    debug('cp err: ' + err);
  });
}

module.exports = { cp };