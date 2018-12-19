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
      } catch (error) {
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

// todo: waitingForContainerStopped();

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
    target = path.posix.join('/code', path.basename(codeUri));
  }

  // Mount the code directory as read only
  return {
    Type: 'bind',
    Source: absPath,
    Target: target,
    ReadOnly: true
  };
}


async function resolveNasConfigToMount(nasConfig, tplPath) {

  if (!nasConfig) return null;

  const tplFolder = path.dirname(tplPath);

  const mountPoints = nasConfig.MountPoints;

  if (mountPoints) {
    const serverAddrReGe = /^[a-z0-9-.]*.nas.[a-z]+.com:\//;

    for (let mountPoint of mountPoints) {
      // '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/'
      const serverAddr = mountPoint.ServerAddr;
      const mountDir = mountPoint.MountDir;

      // valid serverAddr
      if (!serverAddrReGe.test(serverAddr)) {
        throw new Error(`NASConfig's nas server address '${serverAddr}' doesn't match expected format (allowed: '^[a-z0-9-.]*.nas.[a-z]+.com:/')`);
      }
      
      const suffix = '.com:';
      const index = serverAddr.lastIndexOf(suffix);

      // /
      let mountSource = serverAddr.substr(index + suffix.length);
      // 012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com
      let serverPath = serverAddr.substr(0, serverAddr.length - mountSource.length - 1);

      const nasDir = path.join(tplFolder, '.fun', 'nas', serverPath);

      if (!fs.existsSync(nasDir)) {
        fs.mkdirSync(nasDir, {recursive: true});
      } 

      const nasMountDir = path.join(nasDir, mountSource);

      // The mounted nas directory must exist. 
      if (!fs.existsSync(nasMountDir)) {
        throw new Error(`Your local mocked nas dir is ${nasMountDir}. please make sure it already exist.\nYou can also use ${serverPath}:/ instead of ${serverAddr}\n`);
      } 

      console.log('mouting local nas mock dir %s into container %s\n', nasMountDir, mountDir);
      
      return {
        Type: 'bind',
        Source: nasMountDir,
        Target: mountDir,
        ReadOnly: false
      };
    }
  }
  
  return null;
}

async function imageExist(imageName) {
  const images = await docker.listImages({
    filters: {
      reference: [imageName]
    }
  });

  return images.length > 0;
}

function generateDockerCmd(functionProps, httpMode) {
  const cmd = ['-h', functionProps.Handler];

  // always pass event using stdin mode
  cmd.push('--stdin');

  if (httpMode) {
    cmd.push('--http');
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

function resolveRuntimeToDockerImage(runtime) {
  if (runtimeImageMap[runtime]) {
    const name = runtimeImageMap[runtime];
    const imageName = `aliyunfc/runtime-${name}:1.2.0`;

    debug('imageName: ' + imageName);

    return imageName;
  } 

  console.error(red(`invalid runtime name ${runtime}`));
  process.exit(-1);
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

async function generateDockerOpts(runtime, containerName, mounts, cmd, debugPort, envs, dockerUser) {

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

function generateRamdomContainerName() {
  return `fun_local_${new Date().getTime()}`;
}

async function generateDockerEnvs(functionProps, debugPort, httpParams) {
  const envs = [];

  if (httpParams) {
    envs.push(`FC_HTTP_PARAMS=${httpParams}`);
  }

  if (debugPort) {
    const env = generateDebugEnv(functionProps.Runtime, debugPort);

    debug('debug env: ' + env);
    envs.push(env);
  }

  envs.push(...generateFunctionEnvs(functionProps));

  const profile = await getProfile();

  envs.push('local=true', `FC_ACCESS_KEY_ID=${profile.accessKeyId}`, `FC_ACCESS_KEY_SECRET=${profile.accessKeySecret}`);

  return envs;
}

async function pullImageIfNeed(imageName) {
  const exist = await imageExist(imageName);

  if (!exist || !skipPullImage) {
    await pullImage(imageName);
  } else {
    console.log(`skip pulling image ${imageName}...`);
  }
}

async function showDebugIdeTips(serviceName, functionName, runtime, codeSource, debugPort) {
  const vscodeDebugConfig = await generateVscodeDebugConfig(serviceName, functionName, runtime, codeSource, debugPort);

  // todo: auto detect .vscode/launch.json in codeuri path.
  console.log(blue('you can paste these config to .vscode/launch.json, and then attach to your running function'));
  console.log('///////////////// config begin /////////////////');
  console.log(JSON.stringify(vscodeDebugConfig, null, 4));
  console.log('///////////////// config end /////////////////');
}

function writeEventToStreamAndClose(stream, event) {

  if (event) {
    stream.write(event);
  } 

  stream.end();
}

async function runDocker(opts, containerName, event, outputStream, errorStream) {
  // see https://github.com/apocas/dockerode/pull/38
  const container = await docker.createContainer(opts);

  const attachOpts = {
    hijack: true,
    stream: true,
    stdin: true,
    stdout: true,
    stderr: true
  };

  const stream = await container.attach(attachOpts);

  if (!outputStream) {
    outputStream = process.stdin;
  }

  if (!errorStream) {
    errorStream = process.stderr;
  }

  container.modem.demuxStream(stream, outputStream, errorStream);

  await container.start();

  containers.add(containerName);

  writeEventToStreamAndClose(stream, event);

  await container.wait();

  containers.delete(containerName);
}

function resolveDockerUser(nasConfig) {
  let uid = 0;
  let gid = 0;

  if (nasConfig) {
    const userId = nasConfig.UserId;
    const groupId = nasConfig.GroupId;

    if (userId !== -1) {
      uid = userId;
    }

    if (groupId !== -1) {
      gid = groupId;
    }
  }

  return `${uid}:${gid}`;
}

async function invokeFunction(serviceName, functionName, functionDefinition, debugPort, event, debugIde, httpParams, outputStream, errorStream, nasConfig, tplPath, httpMode) {

  // todo: exit container, when use ctrl + c

  const functionProps = functionDefinition.Properties;

  const runtime = functionProps.Runtime;
  const codeUri = functionProps.CodeUri;

  debug(`runtime: ${runtime}`);
  debug(`codeUri: ${codeUri}`);

  const mounts = [];

  const codeMount = await resolveCodeUriToMount(codeUri);

  mounts.push(codeMount);

  const nasMount = await resolveNasConfigToMount(nasConfig, tplPath);

  const dockerUser = await resolveDockerUser(nasConfig);

  if (nasMount) {
    mounts.push(nasMount);
  }

  debug(`docker mounts: %s`, JSON.stringify(mounts, null, 4));
  debug('debug port: %d', debugPort);

  const imageName = resolveRuntimeToDockerImage(runtime);

  await pullImageIfNeed(imageName);

  if (debugPort && debugIde) {
    await showDebugIdeTips(serviceName, functionName, runtime, codeMount.Source, debugPort);
  }

  const containerName = generateRamdomContainerName();

  const envs = await generateDockerEnvs(functionProps, debugPort, httpParams);

  const cmd = generateDockerCmd(functionProps, httpMode);
  
  const opts = await generateDockerOpts(runtime, containerName, mounts, cmd, debugPort, envs, dockerUser);

  debug('docker opts: %j', opts);

  await runDocker(opts, containerName, event, outputStream, errorStream);
}

module.exports = {
  imageExist, generateDockerCmd, resolveRuntimeToDockerImage,
  pullImage, generateDockerOpts, invokeFunction,
  resolveCodeUriToMount, generateFunctionEnvs
};