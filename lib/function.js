'use strict';

const docker = require('./docker');

const debug = require('debug')('fun:local');

async function invokeFunction(serviceName, functionName, functionDefinition, debugPort, event, debugIde, httpParams, outputStream, errorStream, nasConfig, tplPath, httpMode) {
  const functionProps = functionDefinition.Properties;
  
  const runtime = functionProps.Runtime;
  const codeUri = functionProps.CodeUri;
  
  debug(`runtime: ${runtime}`);
  debug(`codeUri: ${codeUri}`);
  
  const mounts = [];
  
  const codeMount = await docker.resolveCodeUriToMount(codeUri);
  
  mounts.push(codeMount);
  
  const nasMount = await docker.resolveNasConfigToMount(nasConfig, tplPath);
  
  const dockerUser = await docker.resolveDockerUser(nasConfig);
  
  if (nasMount) {
    mounts.push(nasMount);
  }
  
  debug(`docker mounts: %s`, JSON.stringify(mounts, null, 4));
  debug('debug port: %d', debugPort);
  
  const imageName = docker.resolveRuntimeToDockerImage(runtime);
  
  await docker.pullImageIfNeed(imageName);
  
  if (debugPort && debugIde) {
    await docker.showDebugIdeTips(serviceName, functionName, runtime, codeMount.Source, debugPort);
  }
  
  const containerName = docker.generateRamdomContainerName();
  
  const envs = await docker.generateDockerEnvs(functionProps, debugPort, httpParams);
  
  const cmd = docker.generateDockerCmd(functionProps, httpMode);
    
  const opts = await docker.generateDockerOpts(runtime, containerName, mounts, cmd, debugPort, envs, dockerUser);
  
  debug('docker opts: %j', opts);
  
  await docker.run(opts, containerName, event, outputStream, errorStream);
}

module.exports = {
  invokeFunction
};