'use strict';

const getProfile = require('./profile').getProfile;
const fs = require('fs-extra');
const path = require('path');
const { blue, red, yellow } = require('colors');
const util = require('util');
const debug = require('debug')('fun:local');
const lstat = util.promisify(fs.lstat);
const Docker = require('dockerode');
const docker = new Docker();
const dockerOpts = require('./docker-opts');
const getVisitor = require('./visitor').getVisitor;
const definition = require('./definition');
const nas = require('./nas');
const { addEnv, addInstallTargetEnv } = require('./install/env');

const _ = require('lodash');

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
      process.exit(-1); // eslint-disable-line
    }
  });
}

waitingForContainerStopped();

const {
  generateVscodeDebugConfig, generateDebugEnv
} = require('./debug');

// todo: add options for pull latest image
const skipPullImage = true;

async function resolveNasConfigToMounts(serviceName, nasConfig, tplPath) {
  if (!tplPath) {
    return [];
  }
  const baseDir = path.dirname(tplPath);
  const mounts = [];

  const nasMappings = await nas.convertNasConfigToNasMappings(baseDir, nasConfig, serviceName);

  for (let { localNasDir, remoteNasDir } of nasMappings) {
    console.log('mouting local nas mock dir %s into container %s\n', localNasDir, remoteNasDir);

    mounts.push({
      Type: 'bind',
      Source: localNasDir,
      Target: remoteNasDir,
      ReadOnly: false
    });
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

function conventInstallTargetsToMounts(installTargets) {

  if (!installTargets) { return []; }

  const mounts = [];

  _.forEach(installTargets, (target) => {
    const { hostPath, containerPath } = target;

    if (!(fs.pathExistsSync(hostPath))) {
      fs.ensureDirSync(hostPath);
    }

    mounts.push({
      Type: 'bind',
      Source: hostPath,
      Target: containerPath,
      ReadOnly: false
    });
  });

  return mounts;
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
  const startTime = new Date();

  const stream = await docker.pull(imageName);

  const visitor = await getVisitor();

  visitor.event({
    ec: 'image',
    ea: 'pull',
    el: 'start'
  }).send();

  const registry = (await dockerOpts.isFromChinaMotherland()) ? 'aliyun registry' : 'docker hub registry';

  return new Promise((resolve, reject) => {
    process.stdout.write(`begin pullling image ${imageName}, you can also use ` + yellow(`'docker pull ${imageName}'`) + ' to pull image');

    const onFinished = (err) => {
      const pullDuration = parseInt((new Date() - startTime)/1000);
      if (err) {
        visitor.event({
          ec: 'image',
          ea: 'pull',
          el: 'error'
        }).send();

        visitor.event({
          ec: 'image',
          ea: `pull from ${registry}`,
          el: 'error'
        }).send();

        visitor.event({
          ec: `image pull from ${registry}`,
          ea: `used ${pullDuration}`,
          el: 'error'
        }).send();

        reject(err);
        return;
      }

      visitor.event({
        ec: 'image',
        ea: `pull from ${registry}`,
        el: 'success'
      }).send();

      visitor.event({
        ec: 'image',
        ea: 'pull',
        el: 'success'
      }).send();

      visitor.event({
        ec: `image pull from ${registry}`,
        ea: `used ${pullDuration}`,
        el: 'success'
      }).send();

      resolve(imageName);
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
        output += event.status + '\n';
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

async function generateDockerEnvs(functionProps, debugPort, httpParams, nasConfig, ishttpTrigger) {
  const envs = {};

  if (httpParams) {
    Object.assign(envs, {
      'FC_HTTP_PARAMS': httpParams
    });
  }

  const runtime = functionProps.Runtime;

  if (debugPort) {
    const debugEnv = generateDebugEnv(runtime, debugPort);

    debug('debug env: ' + debugEnv);

    Object.assign(envs, debugEnv);
  }

  if (ishttpTrigger && runtime === 'java8') {
    envs['fc_enable_new_java_ca'] = 'true';
  }

  Object.assign(envs, generateFunctionEnvs(functionProps));

  const profile = await getProfile();

  Object.assign(envs, {
    'local': true,
    'FC_ACCESS_KEY_ID': profile.accessKeyId,
    'FC_ACCESS_KEY_SECRET': profile.accessKeySecret
  });

  return addEnv(envs, nasConfig);
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

async function isDockerToolBox() {

  const dockerInfo = await docker.info();

  const obj = (dockerInfo.Labels || []).map(e => _.split(e, '=', 2))
    .filter(e => e.length === 2)
    .reduce((acc, cur) => (acc[cur[0]] = cur[1], acc), {});

  return process.platform === 'win32' && obj.provider === 'virtualbox';
}

async function run(opts, event, outputStream, errorStream) {

  const container = await createContainer(opts);

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
  let uid = 10003;
  let gid = 10003;

  const isNasAuto = definition.isNasAutoConfig(nasConfig);

  if (nasConfig && !isNasAuto) {
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

async function createContainer(opts) {

  let container;
  try {
    // see https://github.com/apocas/dockerode/pull/38
    container = await docker.createContainer(opts);
  } catch (ex) {

    if (ex.message.indexOf('invalid mount config for type') !== -1 && await isDockerToolBox()) {

      throw new Error(red(`The default host machine path for docker toolbox is under 'C:\\Users', Please make sure your project is in this directory. If you want to mount other disk paths, please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md .`));
    }
    throw ex;
  }
  return container;
}

// outputStream, errorStream used for http invoke
// because agent is started when container running and exec could not receive related logs
async function startContainer(opts, outputStream, errorStream) {

  const container = await createContainer(opts);

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

async function startInstallationContainer({ runtime, imageName, codeUri, targets }) {
  debug(`runtime: ${runtime}`);
  debug(`codeUri: ${codeUri}`);

  if (await isDockerToolBox()) {

    throw new Error(red(`\nWe detected that you are using docker toolbox. For a better experience, please upgrade 'docker for windows'.\nYou can refer to Chinese doc https://github.com/alibaba/funcraft/blob/master/docs/usage/installation-zh.md#windows-%E5%AE%89%E8%A3%85-docker or English doc https://github.com/alibaba/funcraft/blob/master/docs/usage/installation.md.`));
  }

  if (!imageName) {
    imageName = await dockerOpts.resolveRuntimeToDockerImage(runtime, true);
    if (!imageName) {
      throw new Error(`invalid runtime name ${runtime}`);
    }
  }

  const codeMount = await resolveCodeUriToMount(codeUri, false);

  const installMounts = conventInstallTargetsToMounts(targets);

  const mounts = [codeMount, ...installMounts];

  await pullImageIfNeed(imageName);

  const envs = addInstallTargetEnv({}, targets);

  const opts = await dockerOpts.generateInstallOpts(imageName, mounts, envs);

  return await startContainer(opts);
}

module.exports = {
  imageExist, generateDockerCmd,
  pullImage,
  resolveCodeUriToMount, generateFunctionEnvs, run, generateRamdomContainerName,
  generateDockerEnvs, pullImageIfNeed,
  showDebugIdeTips, resolveDockerUser, resolveNasConfigToMounts,
  startInstallationContainer, startContainer, isDockerToolBox,
  conventInstallTargetsToMounts
};