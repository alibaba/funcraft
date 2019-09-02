'use strict';
const { sendCmdRequest, getNasHttpTriggerPath } = require('./request');
const { green } = require('colors');

function generateRmCmd(nasPath, isRecursiveOpt, isForceOpt) {
  let cmd = 'rm ' + (isRecursiveOpt ? '-R ' : '') + (isForceOpt ? '-f ' : '') + nasPath;
  return cmd;
}

async function rm(serviceName, nasPath, isRecursiveOpt, isForceOpt) {
  console.log('Removing...');
  const nasHttpTriggerPath = await getNasHttpTriggerPath(serviceName);

  const rmCmd = generateRmCmd(nasPath, isRecursiveOpt, isForceOpt);

  const rmResponse = await sendCmdRequest(nasHttpTriggerPath, rmCmd);
  
  console.log(rmResponse.data.stdout);
  console.log(rmResponse.data.stderr);
  console.log(`${green('✔')} remove ${nasPath} done`);
}

module.exports = rm;