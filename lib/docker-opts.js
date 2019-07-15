'use strict';

const {
  generateDockerDebugOpts
} = require('./debug');

const debug = require('debug')('docker-opts');
const nestedObjectAssign = require('nested-object-assign');
const { addEnv } = require('./install/env');

const _ = require('lodash');

const path = require('path');
const { red } = require('colors');

const runtimeImageMap = {
  'nodejs6': 'nodejs6',
  'nodejs8': 'nodejs8',
  'python2.7': 'python2.7',
  'python3': 'python3.6',
  'java8': 'java8',
  'php7.2': 'php7.2'
};

function resolveDockerEnv(envs = {}) {
  return _.map(addEnv(envs || {}), (v, k) => `${k}=${v}`);
}

function resolveRuntimeToDockerImage(runtime, isBuild) {
  if (runtimeImageMap[runtime]) {
    const name = runtimeImageMap[runtime];
    var imageName;
    if (isBuild) {
      imageName = `aliyunfc/runtime-${name}:build-1.5.5`;
    } else {
      imageName = `aliyunfc/runtime-${name}:1.5.5`;
    }

    debug('imageName: ' + imageName);

    return imageName;
  }

  throw new Error(red(`invalid runtime name ${runtime}`));
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

  const isDockerToolBox = await require('./docker.js').isDockerToolBox();

  if (isDockerToolBox) {

    console.warn(red(`We detected that you are using docker toolbox, please upgrade docker for windows.\nYou can refer to Chinese doc https://github.com/alibaba/funcraft/blob/master/docs/usage/installation-zh.md#windows-%E5%AE%89%E8%A3%85-docker or English doc https://github.com/alibaba/funcraft/blob/master/docs/usage/installation.md.\n`));

    if (mounts.length > 0 && Reflect.ownKeys(mounts[0]).length > 0) {
      // C:\\Users\\image_crawler\\code -> /c/Users/image_crawler/code
      const souecePath = mounts[0].Source.split(':').join('');
      const lowerFirstAndReplace = _.lowerFirst(souecePath.split(path.sep).join('/'));
      mounts[0].Source = '/' + lowerFirstAndReplace;
    }
  }

  const hostOpts = {
    HostConfig: {
      AutoRemove: true,
      Mounts: mounts
    }
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
      Env: resolveDockerEnv(envs),
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
      Mounts: mounts
    }
  };

  let debugOpts = {};

  if (debugPort) {
    debugOpts = generateDockerDebugOpts(runtime, debugPort);
  }

  const imageName = resolveRuntimeToDockerImage(runtime);

  const opts = nestedObjectAssign(
    {
      Env: resolveDockerEnv(envs),
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
  resolveMockScript, resolveDockerEnv
};