'use strict';
const { sendCmdRequest, getNasHttpTriggerPath } = require('./request');

function generateLsCmd(nasPath, isAllOpt, isLongOpt) {
  let cmd = 'ls ' + (isAllOpt ? '-a ' : '') + (isLongOpt ? '-l ' : '') + nasPath;
  return cmd;
}

async function ls(serviceName, nasPath, isAllOpt, isLongOpt) {
  const nasHttpTriggerPath = getNasHttpTriggerPath(serviceName);

  const lsCmd = generateLsCmd(nasPath, isAllOpt, isLongOpt);

  const lsResponse = await sendCmdRequest(nasHttpTriggerPath, lsCmd);
  
  console.log(lsResponse.data.stdout);
  console.log(lsResponse.data.stderr);
}

module.exports = ls;