'use strict';

const docker = require('../docker');
const { execSync } = require('child_process');
const fs = require('fs-extra');
const buildOpts = require('./build-opts');
const fcBuilders = require('@alicloud/fc-builders');
const { processorTransformFactory } = require('../error-processor');
const path = require('path');
const buildkit = require('../buildkit');

async function buildInDocker(serviceName, serviceRes, functionName, functionRes, baseDir, codeUri, funcArtifactDir, verbose, preferredImage, stages) {
  const opts = await buildOpts.generateBuildContainerBuildOpts(serviceName, 
    serviceRes, 
    functionName,
    functionRes,
    baseDir,
    codeUri,
    funcArtifactDir,
    verbose, 
    preferredImage,
    stages);

  const usedImage = opts.Image;

  if (!preferredImage) {
    await docker.pullImageIfNeed(usedImage);
  }

  console.log('\nbuild function using image: ' + usedImage);

  // todo: 1. create container, copy source code to container
  // todo: 2. build and then copy artifact output 

  const errorTransform = processorTransformFactory({
    serviceName: serviceName,
    functionName: functionName,
    errorStream: process.stderr
  });

  const exitRs = await docker.run(opts, null, process.stdout, errorTransform);
  if (exitRs.StatusCode !== 0) {
    throw new Error(`build function ${serviceName}/${functionName} error`);
  }
}

async function buildInBuildkit(serviceName, serviceRes, functionName, functionRes, baseDir, codeUri, funcArtifactDir, verbose, stages) {
  const targetBuildStage = 'buildresult';
  const dockerfilePath = path.join(codeUri, '.buildkit.generated.dockerfile');
  await buildOpts.generateDockerfileForBuildkit(dockerfilePath, serviceName, 
    serviceRes, 
    functionName, 
    functionRes, 
    baseDir, 
    codeUri, 
    funcArtifactDir, 
    verbose, 
    stages,
    targetBuildStage);
  
  // exec build
  execSync(
    `buildctl build --no-cache --frontend dockerfile.v0 --local context=${baseDir} --local dockerfile=${path.dirname(dockerfilePath)} --opt filename=${path.basename(dockerfilePath)} --opt target=${targetBuildStage} --output type=local,dest=${baseDir}`, {
      stdio: 'inherit'
    });
  // clean
  await fs.remove(dockerfilePath);
  const dockerfileInArtifact = path.join(funcArtifactDir, path.basename(dockerfilePath));
  if (await fs.pathExists(dockerfileInArtifact)) {
    await fs.remove(dockerfileInArtifact);
  }
  const passwdMount = await buildkit.resolvePasswdMount(baseDir);
  if (passwdMount) {
    const pwdFilePath = passwdMount.Source;
    await fs.remove(pwdFilePath);
    const pwdFileInArtifact = path.join(funcArtifactDir, path.basename(pwdFilePath));
    if (await fs.pathExists(pwdFileInArtifact)) {
      await fs.remove(pwdFileInArtifact);
    }
  }
}

async function buildInProcess(serviceName, functionName, codeUri, runtime, funcArtifactDir, verbose, stages) {
  const builder = new fcBuilders.Builder(serviceName, functionName, codeUri, runtime, funcArtifactDir, verbose, stages);
  await builder.build();
}

module.exports = { buildInDocker, buildInProcess, buildInBuildkit };