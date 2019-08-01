'use strict';
const { sendCmdReqequest, getNasHttpTriggerPath } = require('./request');

function generateLsCmd(nasPath, isAllOpt, isListOpt) {
  let cmd = 'ls ' + (isAllOpt ? '-a ' : '') + (isListOpt ? '-l ' : '') + nasPath;
  return cmd;
}

async function ls(serviceName, nasPath, isAllOpt, isListOpt) {
  const nasHttpTriggerPath = await getNasHttpTriggerPath(serviceName);

  const lsCmd = generateLsCmd(nasPath, isAllOpt, isListOpt);

  const lsResponse = await sendCmdReqequest(nasHttpTriggerPath, lsCmd);
  console.log(lsResponse.data);

  console.log(lsResponse.data.stdout);
  console.log(lsResponse.data.stderr);
}

module.exports = ls;