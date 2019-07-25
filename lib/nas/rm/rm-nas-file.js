'use strict';
const debug = require('debug')('fun:nas:rm');
const { sendCmdReq } = require('../cp/http-request');

function generateRmCmd(nasPath, recurs, force) {
  let cmd = 'rm ' + (recurs ? '-R ' : '') + (force ? '-f ' : '') + nasPath;
  return cmd;
}
async function rm(nasPath, recurs, force, serviceName) {
  
  let commonPath = await require('../cp/http-config').getCommonPath(serviceName);
  let cmd = generateRmCmd(nasPath, recurs, force);
  
  debug(cmd);
  
  sendCmdReq(commonPath, cmd).then((rmContent) => {
    console.log(rmContent.data);
  }, (err) => {
    console.log('  rm err: ' + err);
    debug('rm err: ' + err);
  });
}

module.exports = { rm };