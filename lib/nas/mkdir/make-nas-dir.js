'use strict';
const debug = require('debug')('fun:nas:mkdir');
const sendCmdReq = require('../cp/http-request').sendCmdReq;
const getNasHttpTriggerPath = require('../cp/http-config').getNasHttpTriggerPath;
function generateMkdirCmd(nasDir, verbose, mode, parents) {
  let cmd = 'mkdir ' + (verbose ? '-v ' : '') + (parents ? '-p ' : '');
  if (mode !== undefined) {
    cmd = cmd + `-m mode `;
  }
  cmd = cmd + nasDir;
  return cmd;
}
async function mkdir(nasDir, verbose, mode, parents, serviceName) {
  
  let commonPath = await getNasHttpTriggerPath(serviceName);
  let cmd = generateMkdirCmd(nasDir, verbose, mode, parents);
  
  debug(cmd);
  
  sendCmdReq(commonPath, cmd).then((mkdirContent) => {
    console.log(mkdirContent.data);
  }, (err) => {
    console.log('  mkdir err: ' + err);
    debug('mkdir err: ' + err);
  });
}

module.exports = { mkdir };