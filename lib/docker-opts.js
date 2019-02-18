'use strict';

const {
  generateDockerDebugOpts
} = require('./debug');

const debug = require('debug')('docker-opts');
const nestedObjectAssign = require('nested-object-assign');

const { red } = require('colors');

const runtimeImageMap = {
  'nodejs6': 'nodejs6',
  'nodejs8': 'nodejs8',
  'python2.7': 'python2.7',
  'python3': 'python3.6',
  'java8': 'java8',
  'php7.2': 'php7.2'
};

function resolveRuntimeToDockerImage(runtime, isBuild) {
  if (runtimeImageMap[runtime]) {
    const name = runtimeImageMap[runtime];
    var imageName;
    if (isBuild) {
      imageName = `aliyunfc/runtime-${name}:build-1.5.0`;
    } else {
      imageName = `aliyunfc/runtime-${name}:1.5.0`;
    }

    debug('imageName: ' + imageName);

    return imageName;
  }

  console.error(red(`invalid runtime name ${runtime}`));
  process.exit(-1);
}

function generateInstallOpts(imageName, mount) {
  return {
    Image: imageName,
    Tty: true,
    Cmd: ['/bin/bash'],
    HostConfig: {
      AutoRemove: true,
      Mounts: [
        mount
      ]
    }
  };
}

async function generateLocalInvokeOpts(runtime, containerName, mounts, cmd, debugPort, envs, dockerUser) {

  const hostOpts = {
    HostConfig: {
      AutoRemove: true,
      Mounts: mounts,
    },
  };

  let debugOpts = {};

  if (debugPort) {
    debugOpts = generateDockerDebugOpts(runtime, debugPort);
  }

  const stdinOpts = {
    OpenStdin: true,
    Tty: false,
    StdinOnce: true,
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true
  };

  const imageName = resolveRuntimeToDockerImage(runtime);

  const opts = nestedObjectAssign(
    {
      Env: envs,
      Image: imageName,
      name: containerName,
      Cmd: cmd,
      User: dockerUser
    },
    stdinOpts,
    hostOpts,
    debugOpts);


  debug('fc-docker docker options: %j', opts);

  return opts;
}

function resolveMockScript(runtime) {
  return `/var/fc/runtime/${runtime}/mock.sh`;
}

async function generateLocalStartRunOpts(runtime, name, mounts, cmd, debugPort, envs, dockerUser) {

  const hostOpts = {
    HostConfig: {
      AutoRemove: true,
      Mounts: mounts,
    },
  };

  let debugOpts = {};

  if (debugPort) {
    debugOpts = generateDockerDebugOpts(runtime, debugPort);
  }

  const imageName = resolveRuntimeToDockerImage(runtime);

  const opts = nestedObjectAssign(
    {
      Env: envs,
      Image: imageName,
      name,
      Cmd: cmd,
      User: dockerUser,
      Entrypoint: [resolveMockScript(runtime)]
    },
    hostOpts,
    debugOpts);

  debug('docker options: %j', opts);

  return opts;
}

module.exports = {
  generateLocalInvokeOpts, resolveRuntimeToDockerImage, 
  generateInstallOpts, generateLocalStartRunOpts,
  resolveMockScript
};