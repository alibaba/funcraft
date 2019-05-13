'use strict';

const getProfile = require('./profile').getProfile;
const mkdirp = require('mkdirp-promise');
const fs = require('fs');
const path = require('path');
const { blue, red, yellow } = require('colors');
const util = require('util');
const debug = require('debug')('fun:local');
const lstat = util.promisify(fs.lstat);
const Docker = require('dockerode');
const docker = new Docker();
const dockerOpts = require('./docker-opts');

var containers = new Set();

const devnull = require('dev-null');

// exit container, when use ctrl + c
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
  
  process.on('SIGINT', async () => {

    debug('containers length: ', containers.length);

    if (stopping) {
      return;
    }

    // Just fix test on windows
    // Because process.emit('SIGINT') in test/docker.test.js will not trigger rl.on('SIGINT')
    // And when listening to stdin the process never finishes until you send a SIGINT signal explicitly.
    if (rl) {
      rl.close();
    }

    if (!containers.size) {
      return;
    }

    stopping = true;

    console.log(`\nreceived canncel request, stopping running containers.....`);

    const jobs = [];

    for (let container of containers) {
      try {
        const c = docker.getContainer(container);

        await c.inspect();

        console.log(`stopping container ${container}`);

        jobs.push(c.stop());
      } catch (error) {
        debug('get container instance error, ignore container to stop, error is', error);
      }
    }

    try {
      await Promise.all(jobs);
      console.log('all containers stopped');
    } catch (error) {
      console.error(error);
      process.exit(-1);
    }
  });
}

waitingForContainerStopped();

const {
  generateVscodeDebugConfig, generateDebugEnv
} = require('./debug');

// todo: add options for pull latest image
const skipPullImage = true;

async function resolveNasConfigToMounts(nasConfig, tplPath) {

  if (!nasConfig) { return []; }

  const tplFolder = path.dirname(tplPath);

  const mountPoints = nasConfig.MountPoints;

  const mounts = [];

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
        await mkdirp(nasDir);
      }

      const nasMountDir = path.join(nasDir, mountSource);

      // The mounted nas directory must exist. 
      if (!fs.existsSync(nasMountDir)) {
        throw new Error(`Your local mocked nas dir is ${nasMountDir}. please make sure it already exist.\nYou can also use ${serverPath}:/ instead of ${serverAddr}\n`);
      }

      console.log('mouting local nas mock dir %s into container %s\n', nasMountDir, mountDir);

      mounts.push({
        Type: 'bind',
        Source: nasMountDir,
        Target: mountDir,
        ReadOnly: false
      });
    }
  }

  return mounts;
}

// todo: 当前只支持目录以及 jar。code uri 还可能是 oss 地址、目录、jar、zip?
async function resolveCodeUriToMount(codeUri, readOnly = true) {
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
    ReadOnly: readOnly
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

// dockerode exec 在 windows 上有问题，用 exec 的 stdin 传递事件，当调用 stream.end() 时，会直接导致 exec 退出，且 ExitCode 为 null
function generateDockerCmd(functionProps, httpMode, invokeInitializer = true, event = null) {
  const cmd = ['-h', functionProps.Handler];

  // 如果提供了 event
  if (event !== null) {
    cmd.push('--event', Buffer.from(event).toString('base64'));
    cmd.push('--event-decode');
  } else {
    // always pass event using stdin mode
    cmd.push('--stdin');
  }

  if (httpMode) {
    cmd.push('--http');
  }

  const initializer = functionProps.Initializer;

  if (initializer && invokeInitializer) {
    cmd.push('-i', initializer);
  }

  const initializationTimeout = functionProps.InitializationTimeout;

  // initializationTimeout is defined as integer, see lib/validate/schema/function.js
  if (initializationTimeout) {
    cmd.push('--initializationTimeout', initializationTimeout.toString());
  }

  debug(`docker cmd: ${cmd}`);

  return cmd;
}

async function pullImage(imageName) {
  // copied from lib/edge/container.js
  const stream = await docker.pull(imageName);
  return new Promise((resolve, reject) => {
    process.stdout.write(`begin pullling image ${imageName}, you can also use ` + yellow(`'docker pull ${imageName}'`) + ' to pull image');

    const onFinished = (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(imageName+'\n');
    };
    const slog = require('single-line-log').stdout;
    const statuses = {};
    const onProgress = (event) => {
      let status = event.status;
      if (event.progress) {
        status = `${event.status} ${event.progress}`;
      }
      if (event.id) {
        statuses[event.id] = status;
      }
      // Print
      let output = '';
      const keys = Object.keys(statuses);
      for (const key of keys) {
        output += key + ': ' + statuses[key] + '\n';
      }
      if (!event.id) {
        output += event.status+'\n';
      }
      slog(output);
    };
    docker.modem.followProgress(stream, onFinished, onProgress);
  });
}

function generateFunctionEnvs(functionProps) {
  const environmentVariables = functionProps.EnvironmentVariables;

  if (!environmentVariables) { return {}; }

  return Object.assign({}, environmentVariables);
}

function generateRamdomContainerName() {
  return `fun_local_${new Date().getTime()}_${Math.random().toString(36).substr(2, 7)}`;
}

async function generateDockerEnvs(functionProps, debugPort, httpParams) {
  const envs = {};

  if (httpParams) {
    Object.assign(envs, {
      'FC_HTTP_PARAMS': httpParams
    });
  }

  if (debugPort) {
    const debugEnv = generateDebugEnv(functionProps.Runtime, debugPort);

    debug('debug env: ' + debugEnv);

    Object.assign(envs, debugEnv);
  }

  Object.assign(envs, generateFunctionEnvs(functionProps));
  
  const profile = await getProfile();

  Object.assign(envs, {
    'local': true,
    'FC_ACCESS_KEY_ID': profile.accessKeyId,
    'FC_ACCESS_KEY_SECRET': profile.accessKeySecret
  });

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

async function run(opts, event, outputStream, errorStream) {

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
    outputStream = process.stdout;
  }

  if (!errorStream) {
    errorStream = process.stderr;
  }

  var isWin = process.platform === 'win32';
  if (!isWin) {
    container.modem.demuxStream(stream, outputStream, errorStream);
  }

  await container.start();

  // dockerode bugs on windows. attach could not receive output and error 
  if (isWin) {
    const logStream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true
    });

    container.modem.demuxStream(logStream, outputStream, errorStream);
  }

  containers.add(container.id);

  writeEventToStreamAndClose(stream, event);

  await container.wait();

  containers.delete(container.id);
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

// outputStream, errorStream used for http invoke
// because agent is started when container running and exec could not receive related logs
async function startContainer(opts, outputStream, errorStream) {

  const container = await docker.createContainer(opts);

  containers.add(container.id);

  try {
    await container.start({});
  } catch (err) {
    console.error(err);
  }

  const logs = outputStream || errorStream;

  if (logs) {
    if (!outputStream) {
      outputStream = devnull();
    }

    if (!errorStream) {
      errorStream = devnull();
    }

    // dockerode bugs on windows. attach could not receive output and error, must use logs
    const logStream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true
    });

    container.modem.demuxStream(logStream, outputStream, errorStream);
  }

  return {
    stop: async () => {
      await container.stop();
      containers.delete(container.id);
    },

    exec: async (cmd, {cwd = '', env = {}, outputStream, errorStream, verbose = false } = {}) => {
      const options = {
        Cmd: cmd,
        Env: dockerOpts.resolveDockerEnv(env),
        Tty: false,
        AttachStdin: false,  
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: cwd
      };

      // docker exec
      debug('docker exec opts: ' + JSON.stringify(options, null, 4));

      const exec = await container.exec(options);

      const stream = (await exec.start({hijack: true, stdin: false})).output;

      // todo: have to wait, otherwise stdin may not be readable
      await new Promise(resolve => setTimeout(resolve, 30));

      if (!outputStream) {
        outputStream = process.stdout;
      }

      if (!errorStream) {
        errorStream = process.stderr;
      }
      
      if (verbose) {
        container.modem.demuxStream(stream, outputStream, errorStream);
      } else {
        container.modem.demuxStream(stream, devnull(), errorStream);
      }

      return new Promise((resolve, reject) => {

        // stream.on('end') could not receive end event on windows.
        // so use inspect to check exec exit
        function waitContainerExec() {
          exec.inspect((err, data) => {

            if (data.Running) {
              setTimeout(waitContainerExec, 100);
              return ;
            }

            if (err) {
              debug('docker exec inspect err', err);
              reject(err);
            } else if (data.ExitCode !== 0) {
              reject(red(`${data.ProcessConfig.entrypoint} exited with code ${data.ExitCode}`));
            } else {
              resolve(data.ExitCode);
            }
          });

        }

        waitContainerExec(); 
      });
    }
  };  
}

async function startInstallationContainer({ runtime, imageName, codeUri }) {
  debug(`runtime: ${runtime}`);
  debug(`codeUri: ${codeUri}`);

  if (!imageName) {
    imageName = dockerOpts.resolveRuntimeToDockerImage(runtime, true);
    if (!imageName) {
      throw new Error(`invalid runtime name ${runtime}`);
    }
  }

  const mount = await resolveCodeUriToMount(codeUri, false);

  await pullImageIfNeed(imageName);

  const opts = await dockerOpts.generateInstallOpts(imageName, mount);

  return await startContainer(opts);
}

module.exports = {
  imageExist, generateDockerCmd,
  pullImage,
  resolveCodeUriToMount, generateFunctionEnvs, run, generateRamdomContainerName,
  generateDockerEnvs, pullImageIfNeed,
  showDebugIdeTips, resolveDockerUser, resolveNasConfigToMounts,
  startInstallationContainer, startContainer
};