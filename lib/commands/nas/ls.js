'use strict';

const lsNasFile = require('../../nas/ls/ls-nas-file').ls;
const parseNasPath = require('../../nas/cp/path-support').parseNasPath;
async function ls(context) {
  
  const nasDir = context.nasDir;
  const allFlag = context.all;
  const listFlag = context.list;
   
  try {
    var { nasPath, serviceName } = await parseNasPath(nasDir); 
  } catch (error) {
    console.log(error);
    return;
  }
  
  await lsNasFile(nasPath, allFlag, listFlag, serviceName);
}

module.exports = ls;
