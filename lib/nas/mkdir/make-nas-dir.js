'use strict';
const debug = require('debug')('fun:nas:mkdir');
const { sendCmdReq } = require('../cp/http-request');

function generateMkdirCmd(nasDir, verbose, mode, parents) {
  let cmd = 'mkdir ' + (verbose ? '-v ' : '') + (parents ? '-p ' : '');
  if (mode !== undefined) {
    cmd = cmd + `-m mode `;
  }
  cmd = cmd + nasDir;
  return cmd;
}
async function mkdir(nasDir, verbose, mode, parents, serviceName) {
  
  let commonPath = await require('../cp/http-config').getCommonPath(serviceName);
  let cmd = generateMkdirCmd(nasDir, verbose, mode, parents);
  
  debug(cmd);
  
  sendCmdReq(commonPath, cmd).then((mkdirContent) => {
    console.log(mkdirContent.data);
  }, (err) => {
    console.log('an error has  occurred');
    debug('mkdir err: ' + err);
  });
}

module.exports = { mkdir };