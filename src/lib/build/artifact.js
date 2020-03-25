'use strict';


const fs = require('fs-extra');
const path = require('path');
const debug = require('debug');

async function generateRootArtifactDirectory(baseDir) {
  const rootArtifactsDir = path.join(baseDir, '.fun', 'build', 'artifacts');

  await fs.mkdirp(rootArtifactsDir);

  return rootArtifactsDir;
}

async function generateArtifactDirectory(rootArtifactsDir, serviceName, functionName) {
  const funcArtifactDir = path.join(rootArtifactsDir, serviceName, functionName);

  await fs.mkdirp(funcArtifactDir);

  return funcArtifactDir;
}

async function cleanDirectory(directory) {
  debug(`check directory ${directory} exist?`);

  if (await fs.pathExists(directory)) {
    debug(`directory ${directory} exist, begin to remove`);
    await fs.remove(directory);

    debug(`directory ${directory} removed, begin to create`);
    await fs.mkdir(directory);
  }
}

module.exports = {
  generateRootArtifactDirectory,
  generateArtifactDirectory,
  cleanDirectory
};