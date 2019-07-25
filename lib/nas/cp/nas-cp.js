'use strict';
const debug = require('debug')('fun:nas:nascp');
const { sendCmdReq } = require('../cp/http-request');

function generatecpCmd(srcPath, dstPath, dirFlag) {
  let cmd = 'cp ' + (dirFlag ? '-R ' : '') + srcPath + ' ' + dstPath;
  
  return cmd;
}
async function cp(srcPath, dstPath, serviceName, dirFlag) {
  
  let commonPath = await require('./http-config').getCommonPath(serviceName);
  let cmd = generatecpCmd(srcPath, dstPath, dirFlag);

  debug(cmd);
  console.log(cmd);
  sendCmdReq(commonPath, cmd).then((cpContent) => {
    console.log(cpContent.data);
  }, (err) => {
    console.log('an error has  occurred');
    debug('rm err: ' + err);
  });
}

module.exports = { cp };