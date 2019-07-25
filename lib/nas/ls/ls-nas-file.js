'use strict';
const debug = require('debug')('fun:nas:ls');
const { sendCmdReq } = require('../cp/http-request');

function generateLsCmd(nasPath, allFlag, listFlag) {
  let cmd = 'ls ' + (allFlag ? '-a ' : '') + (listFlag ? '-l ' : '') + nasPath;
  return cmd;
}
async function ls(nasPath, allFlag, listFlag, serviceName) {
  
  let commonPath = await require('../cp/http-config').getCommonPath(serviceName);
  
  let cmd = generateLsCmd(nasPath, allFlag, listFlag);
  
  
  sendCmdReq(commonPath, cmd).then((lsContent) => {
    console.log(lsContent.data);
  }, (err) => {
    console.log('  ls err: ' + err);
    debug('ls err: ' + err);
  });
}

module.exports = { ls };