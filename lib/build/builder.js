'use strict';

const docker = require('../docker');

const buildOpts = require('./build-opts');
const fcBuilders = require('@alicloud/fc-builders');

async function buildInContainer(serviceName, serviceRes, functionName, functionRes, baseDir, codeUri, funcArtifactDir, verbose) {
  const opts = await buildOpts.generateBuildContainerBuildOpts(serviceName, 
    serviceRes, 
    functionName,
    functionRes,
    baseDir,
    codeUri,
    funcArtifactDir,
    verbose);

  const exitRs = await docker.run(opts, null, process.stdout, process.stderr);
  if (exitRs.StatusCode !== 0) {
    throw new Error(`build function ${serviceName}/${functionName} error`);
  }
}

async function buildInProcess(serviceName, functionName, codeUri, runtime, funcArtifactDir, verbose) {
  const builder = new fcBuilders.Builder(serviceName, functionName, codeUri, runtime, funcArtifactDir, verbose);
  await builder.build();
}

module.exports = { buildInContainer, buildInProcess };