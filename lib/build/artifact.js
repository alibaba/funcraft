'use strict';

const mkdirp = require('mkdirp-promise');
const fs = require('fs-extra');
const path = require('path');
const debug = require('debug');

async function generateRootArtifactDirectory(projectRoot) {
  const rootArtifactsDir = path.join(projectRoot, '.fun', 'build', 'artifacts');

  await mkdirp(rootArtifactsDir);

  return rootArtifactsDir;
}

async function generateArtifactDirectory(rootArtifactsDir, serviceName, functionName) {
  const funcArtifactDir = path.join(rootArtifactsDir, serviceName, functionName);

  await mkdirp(funcArtifactDir);

  return funcArtifactDir;
}

async function cleanDirectory(directory) {

  debug(`check directory ${directory} exist?`);

  if (fs.existsSync(directory)) {

    debug(`directory ${directory} exist, begin to remove`);

    fs.removeSync(directory);

    debug(`directory ${directory} removed, begin to create`);

    fs.mkdirpSync(directory);
  }
}

module.exports = {
  generateRootArtifactDirectory,
  generateArtifactDirectory,
  cleanDirectory
};