'use strict';
const debug = require('debug')('fun:nas:nascp');
const { sendCmdReq } = require('../cp/http-request');
const getNasHttpTriggerPath = require('./http-config').getNasHttpTriggerPath;
function generatecpCmd(srcPath, dstPath, isDir) {
  const cmd = 'cp ' + (isDir ? '-R ' : '') + srcPath + ' ' + dstPath;
  
  return cmd;
}
async function cp(srcPath, dstPath, serviceName, isDir) {
  
  const commonPath = await getNasHttpTriggerPath(serviceName);
  const cmd = generatecpCmd(srcPath, dstPath, isDir);

  debug(cmd);
  
  sendCmdReq(commonPath, cmd).then((cpContent) => {
    console.log(cpContent.data);
  }, (err) => {
    console.log('   cp err ' + err);
  });
}

module.exports = { cp };