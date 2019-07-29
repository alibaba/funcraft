'use strict';
const debug = require('debug')('fun:nas:mkdir');
const sendCmdReq = require('../cp/http-request').sendCmdReq;
const getNasHttpTriggerPath = require('../cp/http-config').getNasHttpTriggerPath;
function generateMkdirCmd(nasDir, isVerboseOpt, mode, isParentsOpt) {
  let cmd = 'mkdir ' + (isVerboseOpt ? '-v ' : '') + (isParentsOpt ? '-p ' : '');
  if (mode !== undefined) {
    cmd = cmd + `-m mode `;
  }
  cmd = cmd + nasDir;
  return cmd;
}
async function mkdir(nasDir, isVerboseOpt, mode, isParentsOpt, serviceName) {
  
  let commonPath = await getNasHttpTriggerPath(serviceName);
  let cmd = generateMkdirCmd(nasDir, isVerboseOpt, mode, isParentsOpt);
  
  debug(cmd);
  try {
    let mkdirContent = await sendCmdReq(commonPath, cmd);
    console.log(mkdirContent.data);
  } catch (error) {
    console.log('  mkdir err: ' + error);
  }
  
}

module.exports = { mkdir };