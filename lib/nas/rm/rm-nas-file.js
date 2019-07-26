'use strict';
const debug = require('debug')('fun:nas:rm');
const sendCmdReq = require('../cp/http-request').sendCmdReq;
const getNasHttpTriggerPath = require('../cp/http-config').getNasHttpTriggerPath;
function generateRmCmd(nasPath, recursive, force) {
  let cmd = 'rm ' + (recursive ? '-R ' : '') + (force ? '-f ' : '') + nasPath;
  return cmd;
}
async function rm(nasPath, recursive, force, serviceName) {
  
  let commonPath = await getNasHttpTriggerPath(serviceName);
  let cmd = generateRmCmd(nasPath, recursive, force);
  
  debug(cmd);
  
  sendCmdReq(commonPath, cmd).then((rmContent) => {
    console.log(`rm ${nasPath} done`);
    console.log(rmContent.data);
  }, (err) => {
    console.log('  rm err: ' + err);
    debug('rm err: ' + err);
  });
}

module.exports = { rm };