'use strict';

const docker = require('../docker');
const dockerOpts = require('../docker-opts');
const definition = require('../definition');
const path = require('path');
const nas = require('../nas');
const _ = require('lodash');

async function generateBuildContainerBuildOpts(serviceName, serviceRes, functionName, functionRes, baseDir, codeUri, funcArtifactDir, verbose, preferredImage, stages) {
  const functionProps = functionRes.Properties;
  const runtime = functionProps.Runtime;

  const containerName = docker.generateRamdomContainerName();

  const envs = await docker.generateDockerEnvs(baseDir, serviceName, serviceRes.Properties, functionName, functionProps, null, null);

  const codeMount = await docker.resolveCodeUriToMount(path.resolve(baseDir, codeUri), false);

  const nasConfig = definition.findNasConfigInService(serviceRes);
  const nasMounts = await docker.resolveNasConfigToMounts(baseDir, serviceName, nasConfig, nas.getDefaultNasDir(baseDir));
  const passwdMount = await docker.generatePasswdMount();

  const funcArtifactMountDir = '/artifactsMount';

  const artifactDirMount = {
    Type: 'bind',
    Source: funcArtifactDir,
    Target: funcArtifactMountDir,
    ReadOnly: false
  };

  const mounts = _.compact([codeMount, artifactDirMount, ...nasMounts, passwdMount]);

  const params = {
    method: 'build',
    serviceName,
    functionName,
    sourceDir: '/code',
    runtime,
    artifactDir: codeUri === funcArtifactDir ? '/code' : funcArtifactMountDir,
    stages,
    verbose
  };

  const cmd = ['fun-install', 'build', '--json-params', JSON.stringify(params)];

  const opts = await dockerOpts.generateContainerBuildOpts(runtime, containerName, mounts, cmd, envs, preferredImage);

  return opts;
}

module.exports = { generateBuildContainerBuildOpts };