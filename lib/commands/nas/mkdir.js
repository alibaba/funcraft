'use strict';

const parseNasPath = require('../../nas/cp/path-support').parseNasPath;
const makeNasDir = require('../../nas/mkdir/make-nas-dir').mkdir;
async function mkdir(context) {
  
  const verbose = context.verbose;
  const mode = context.mode;
  const parents = context.parents;
  const nasDir = context.nasDir;
  try {
    var {nasPath, serviceName} = await parseNasPath(nasDir);
  } catch (error) {
    console.log(error);
    return;
  }
  
  await makeNasDir(nasPath, verbose, mode, parents, serviceName);
}

module.exports = mkdir;
