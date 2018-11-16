'use strict';

const nestedObjectAssign = require('nested-object-assign');

const fs = require('fs');
const path = require('path');

const { blue, red } = require('colors');
const util = require('util');

const debug = require('debug')('fun:local');

const lstat = util.promisify(fs.lstat);

const Docker = require('dockerode');
const docker = new Docker();

const {
  generateVscodeDebugConfig, generateDebugEnv, generateDockerDebugOpts
} = require('./debug');

// todo: add options for pull latest image
const skipPullImage = true;

const runtimeImageMap = {
  'nodejs6': 'nodejs6',
  'nodejs8': 'nodejs8',
  'python2.7': 'python2.7',
  'python3': 'python3.6',
  'java8': 'java8',
  'php7.2': 'php7.2'
};

// todo: 当前只支持目录以及 jar。code uri 还可能是 oss 地址、目录、jar、zip?
async function resolveCodeUriToMount(codeUri) {
  const absPath = path.resolve(codeUri);
  let target = null;
    
  const stats = await lstat(absPath);
  
  if (stats.isDirectory()) {
    target = '/code';
  } else {
    target = path.join('/code', path.basename(codeUri));
  }
  
  return {
    Type: 'bind',
    Source: absPath,
    Target: target
  };
}

async function imageExist(imageName) {
  const images = await docker.listImages({
    filters: {
      reference: [imageName]
    }
  });

  return images.length > 0;
}

function generateDockerCmd(functionProps, event) {
  const cmd = ['-h', functionProps.Handler];

  if (event) {
    cmd.push('--event', event);
  }

  const initializer = functionProps.Initializer;

  if (initializer) {
    cmd.push('-i', initializer);
  }

  const initializationTimeout = functionProps.InitializationTimeout;

  if (initializationTimeout) {
    cmd.push('--initializationTimeout', initializationTimeout);
  }

  debug(`docker cmd: ${cmd}`);

  return cmd;
}

function findDockerImage(runtime) {
  if (runtimeImageMap[runtime]) {
    const name = runtimeImageMap[runtime];
    const imageName = `aliyunfc/runtime-${name}`;

    debug('imageName: ' + imageName);

    return imageName;
  }
  return null;
}

async function pullImage(imageName) {
  await docker.pull(imageName);
}

function generateFunctionEnvs(functionProps) {
  const environmentVariables = functionProps.EnvironmentVariables;
  
  if (!environmentVariables) { return []; }
  
  let envs = [];
  
  for (const [envName, envValue] of Object.entries(environmentVariables)) {
    envs.push(`${envName}=${envValue}`);
  }
  
  debug(`load function env: ${envs}`);
  
  return envs;
}

function generateDockerOpts(functionProps, runtime, mount, debugPort) {

  let envs = generateFunctionEnvs(functionProps);

  envs.push('local=true');

  const dockerOpts = {
    HostConfig: {
      AutoRemove: true,
      Mounts: [
        mount
      ],
    },
  };

  let dockerDebugOpts = {};

  if (debugPort) {
    const env = generateDebugEnv(runtime, debugPort);

    debug('debug env: ' + env);

    if (env) {
      envs.push(env);
    }
    dockerDebugOpts = generateDockerDebugOpts(runtime, debugPort);
  }

  const opts = nestedObjectAssign(
    {
      Env: envs,
    },
    dockerOpts,
    dockerDebugOpts);

  debug('fc-docker docker options: %j', opts);

  return opts;
}

async function invokeFunction(serviceName, functionName, functionDefinition, debugPort, event) {
  // todo: exit container, when use ctrl + c
  
  const functionProps = functionDefinition.Properties;
  
  const cmd = generateDockerCmd(functionProps, event);
  
  const runtime = functionProps.Runtime;
  
  const codeUri = functionProps.CodeUri;
  const mount = await resolveCodeUriToMount(codeUri);
  
  debug(`runtime: ${runtime}`);
  debug(`codeUri: ${codeUri}`);
  
  const imageName = findDockerImage(runtime);
  
  if (!imageName) {
    console.error(red(`invalid runtime name ${runtime}`));
  }
  
  const exist = await imageExist(imageName);
  
  if (!exist || !skipPullImage) {
    console.log(`begin pulling images ${imageName}...`);
    await pullImage(imageName);
  } else {
    console.log('skip pulling images ...');
  }
  
  debug(`mount source: ${mount}`);
  
  debug('debug port: ' + debugPort);
  
  if (debugPort) {
    const vscodeDebugConfig = await generateVscodeDebugConfig(serviceName, functionName, runtime, mount.Source, debugPort);
  
    // todo: auto detect .vscode/launch.json in codeuri path.
    console.log(blue('you can paste these config to .vscode/launch.json, and then attach to your running function'));
    console.log('///////////////// config begin /////////////////');
    console.log(JSON.stringify(vscodeDebugConfig, null, 4));
    console.log('///////////////// config end /////////////////');
  }
  
  const opts = generateDockerOpts(functionProps, runtime, mount, debugPort);
  
  debug('docker opts: %j' + opts);
  
  await docker.run(imageName, cmd, process.stdout, opts);
}

module.exports = {
  imageExist, generateDockerCmd, findDockerImage, 
  pullImage, generateDockerOpts, invokeFunction,
  resolveCodeUriToMount, generateFunctionEnvs
};