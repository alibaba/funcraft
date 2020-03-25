'use strict';
const { sendCmdRequest, getNasHttpTriggerPath, statsRequest } = require('./request');
const { green, red } = require('colors');
const { checkWritePerm } = require('./support');

function generateRmCmd(nasPath, isRecursiveOpt, isForceOpt) {
  let cmd = 'rm ' + (isRecursiveOpt ? '-R ' : '') + (isForceOpt ? '-f ' : '') + nasPath;
  return cmd;
}

async function rm(serviceName, nasPath, isRecursiveOpt, isForceOpt, nasId) {
  console.log('Removing...');
  const nasHttpTriggerPath = getNasHttpTriggerPath(serviceName);
  const statsRes = await statsRequest(nasPath, nasHttpTriggerPath);

  const stats = statsRes.data;

  if (!stats.exists) {
    throw new Error(`${nasPath} not exist`);
  }

  if (stats.isDir && !isRecursiveOpt) {
    throw new Error(`fun nas rm: ${nasPath}: is a directory`);
  }

  const permTip = checkWritePerm(stats, nasId, nasPath);
  if (permTip) {
    const warningInfo = `fun nas rm: ${permTip}`;
    console.log(red(`Warning: ${warningInfo}`));
  }

  const rmCmd = generateRmCmd(nasPath, isRecursiveOpt, isForceOpt);

  const rmResponse = await sendCmdRequest(nasHttpTriggerPath, rmCmd);
  
  console.log(rmResponse.data.stdout);
  console.log(rmResponse.data.stderr);
  console.log(`${green('✔')} remove ${nasPath} done`);
}

module.exports = rm;