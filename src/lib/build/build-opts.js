'use strict';

const docker = require('../docker');
const dockerOpts = require('../docker-opts');
const definition = require('../definition');
const path = require('path');
const nas = require('../nas');
const _ = require('lodash');
const fs = require('fs-extra');
const buildkit = require('../buildkit');

async function generateBuildContainerBuildOpts(serviceName, serviceRes, functionName, functionRes, baseDir, codeUri, funcArtifactDir, verbose, preferredImage, stages) {
  const functionProps = functionRes.Properties;
  const runtime = functionProps.Runtime;

  const containerName = docker.generateRamdomContainerName();

  const envs = await docker.generateDockerEnvs(baseDir, serviceName, serviceRes.Properties, functionName, functionProps, null, null);

  const codeMount = await docker.resolveCodeUriToMount(path.resolve(baseDir, codeUri), false);

  const nasConfig = definition.findNasConfigInService(serviceRes);
  const nasMounts = await docker.resolveNasConfigToMounts(baseDir, serviceName, nasConfig, nas.getDefaultNasDir(baseDir));
  const passwdMount = await docker.resolvePasswdMount();

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

async function generateDockerfileForBuildkit(dockerfilePath, serviceName, serviceRes, functionName, functionRes, baseDir, codeUri, funcArtifactDir, verbose, stages, targetBuildStage) {
  console.log('Generating dockerfile in buildkit format.');
  const functionProps = functionRes.Properties;
  const runtime = functionProps.Runtime;

  const envs = await docker.generateDockerfileEnvs(baseDir, serviceName, serviceRes.Properties, functionName, functionProps, null, null);

  const codeMount = await docker.resolveCodeUriToMount(path.resolve(baseDir, codeUri), false);
  const nasConfig = definition.findNasConfigInService(serviceRes);
  const nasMounts = await docker.resolveNasConfigToMounts(baseDir, serviceName, nasConfig, nas.getDefaultNasDir(baseDir));

  const funcArtifactMountDir = '/artifactsMount';

  const artifactDirMount = {
    Type: 'bind',
    Source: funcArtifactDir,
    Target: funcArtifactMountDir,
    ReadOnly: false
  };
  // add password to /etc/passwd
  const passwdMount = await buildkit.resolvePasswdMount(baseDir);
  const mountsInDocker = _.compact([codeMount, artifactDirMount, ...nasMounts, passwdMount]);

  const { fromSrcToDstPairsInBuild, fromSrcToDstPairsInOutput } = buildkit.generateSrcDstPairsFromMounts(mountsInDocker);

  const params = {
    'method': 'build',
    'serviceName': serviceName,
    'functionName': functionName,
    'sourceDir': '/code',
    'runtime': runtime,
    'artifactDir': codeUri === funcArtifactDir ? '/code' : funcArtifactMountDir,
    'stages': stages,
    'verbose': verbose
  };

  const cmd = `fun-install build --json-params '${JSON.stringify(params)}'`;
  const contentDir = baseDir;
  const dockerfileContent = await buildkit.dockerfileForBuildkit(runtime, fromSrcToDstPairsInOutput, fromSrcToDstPairsInBuild, contentDir, targetBuildStage, envs, cmd);

  await fs.writeFile(dockerfilePath, dockerfileContent);
}



module.exports = { generateBuildContainerBuildOpts, generateDockerfileForBuildkit };