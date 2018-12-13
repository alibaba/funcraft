'use strict';

const nestedObjectAssign = require('nested-object-assign');

const getProfile = require('./profile').getProfile;

const urlencode = require('urlencode');

const fs = require('fs');
const path = require('path');

const { blue, red } = require('colors');
const util = require('util');

const debug = require('debug')('fun:local');

const lstat = util.promisify(fs.lstat);

const Docker = require('dockerode');
const docker = new Docker();

const http = require('http');

var containers = new Set();

function waitingForContainerStopped() {
  // see https://stackoverflow.com/questions/10021373/what-is-the-windows-equivalent-of-process-onsigint-in-node-js
  let rl;
  if (process.platform === 'win32') {
    rl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
  
    rl.on('SIGINT', function () {
      process.emit('SIGINT');
    });
  }
  
  let stopping = false;
  let success = true;

  process.on('SIGINT', async function () {

    debug('containers length: ', containers.length);

    if (!containers.size) { 
      return;
    }

    if (stopping) {
      return;
    }

    stopping = true;

    console.log(`received canncel request, stopping running functions.`);

    for (let container of containers) {
      console.log(`stopping container ${container}`);

      try {
        await docker.getContainer(container).stop();
      } catch(error) {
        success = false;
        console.error(error);
      }
    }
  });

  // Just fix test on windows
  // Because process.emit('SIGINT') in test/docker.test.js will not trigger rl.on('SIGINT')
  // And when listening to stdin the process never finishes until you send a SIGINT signal explicitly.
  if (rl) {
    rl.close();
  }

  if (!success) {
    process.exit(-1);
  }
}

waitingForContainerStopped();

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
    // could not use path.join('/code', xxx)
    // in windows, it will be translate to \code\xxx, and will not be recorgnized as a valid path in linux container
    target = '/code/' + path.basename(codeUri);
  }
  
  // Mount the code directory as read only
  return {
    Type: 'bind',
    Source: absPath,
    Target: target,
    ReadOnly: true
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
    const imageName = `aliyunfc/runtime-${name}:1.1.0`;

    debug('imageName: ' + imageName);

    return imageName;
  }
  return null;
}

async function pullImage(imageName) {
  
  

  // dockerode pull image will occur problem on windows when using pkg packed binary version
  // error is 'context canceled'
  // see https://github.com/apocas/dockerode/issues/347
  return new Promise((resolve, reject) => {
    const encodedImageName = urlencode(imageName);

    const options = {
      socketPath: docker.modem.socketPath,
      // https://docs.docker.com/develop/sdk/#api-version-matrix
      path: `/images/create?fromImage=${encodedImageName}`,
      method: 'POST',
    };
  
    process.stdout.write(`begin pullling image ${imageName}`);
  
    const callback = res => {
      res.setEncoding('utf8');
  
      if (res.statusCode !== 200) {
        res.on('data', data => {
          reject(data);
        });
      }
      
      res.on('data', data => {
        debug(data);
        process.stdout.write('.');
      });
      
      res.on('error', data => {
        reject(data);
      });

      res.on('end', data => {
        console.log('\npull image finished');
        resolve(data);
      });
  
      res.on('close', data => {
        console.log('\npull image finished');
        resolve(data);
      });
    };
  
    const clientRequest = http.request(options, callback);
    clientRequest.end();
  });
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

async function generateDockerOpts(functionProps, runtime, containerName, mount, debugPort) {

  let envs = generateFunctionEnvs(functionProps);

  const profile = await getProfile();

  envs.push('local=true', `FC_ACCESS_KEY_ID=${profile.accessKeyId}`, `FC_ACCESS_KEY_SECRET=${profile.accessKeySecret}`);

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
      name: containerName
    },
    dockerOpts,
    dockerDebugOpts);

  debug('fc-docker docker options: %j', opts);

  return opts;
}

function generateRamdomContainerName() {
  return `fun_local_${new Date().getTime()}`;
}

async function invokeFunction(serviceName, functionName, functionDefinition, debugPort, event, debugIde) {

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
    await pullImage(imageName);
  } else {
    console.log(`skip pulling image ${imageName}...`);
  }
  
  debug(`mount source: ${mount}`);
  
  debug('debug port: ' + debugPort);
  
  if (debugPort && debugIde) {
    const vscodeDebugConfig = await generateVscodeDebugConfig(serviceName, functionName, runtime, mount.Source, debugPort);
  
    // todo: auto detect .vscode/launch.json in codeuri path.
    console.log(blue('you can paste these config to .vscode/launch.json, and then attach to your running function'));
    console.log('///////////////// config begin /////////////////');
    console.log(JSON.stringify(vscodeDebugConfig, null, 4));
    console.log('///////////////// config end /////////////////');
  }
  
  const containerName = generateRamdomContainerName();

  const opts = await generateDockerOpts(functionProps, runtime, containerName, mount, debugPort);
  
  debug('docker opts: %j' + opts);

  containers.add(containerName);
  
  await docker.run(imageName, cmd, process.stdout, opts);

  containers.delete(containerName);
}

module.exports = {
  imageExist, generateDockerCmd, findDockerImage, 
  pullImage, generateDockerOpts, invokeFunction,
  resolveCodeUriToMount, generateFunctionEnvs
};