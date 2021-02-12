'use strict';

const ip = require('ip');
const fs = require('fs-extra');
const tar = require('tar-fs');
const nas = require('./nas');
const path = require('path');
const debug = require('debug')('fun:local');
const Docker = require('dockerode');
const docker = new Docker();
const dockerOpts = require('./docker-opts');
const getVisitor = require('./visitor').getVisitor;
const getProfile = require('./profile').getProfile;
const { generatePwdFile } = require('./utils/passwd');
const { isCustomContainerRuntime } = require('./common/model/runtime');
const { blue, red, yellow, green } = require('colors');
const { getRootBaseDir } = require('./tpl');
const { parseArgsStringToArgv } = require('string-argv');
const { extractNasMappingsFromNasYml } = require('./nas/support');
const { addEnv, addInstallTargetEnv, resolveLibPathsFromLdConf } = require('./install/env');
const { findPathsOutofSharedPaths } = require('./docker-support');
const { processorTransformFactory } = require('./error-processor');

const isWin = process.platform === 'win32';

const _ = require('lodash');

require('draftlog').into(console);

var containers = new Set();

const devnull = require('dev-null');

// exit container, when use ctrl + c
function waitingForContainerStopped() {
  // see https://stackoverflow.com/questions/10021373/what-is-the-windows-equivalent-of-process-onsigint-in-node-js
  const isRaw = process.isRaw;
  const kpCallBack = (_char, key) => {
    if (key & key.ctrl && key.name === 'c') {
      process.emit('SIGINT');
    }
  };
  if (process.platform === 'win32') {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(isRaw);
    }
    process.stdin.on('keypress', kpCallBack);
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
    process.stdin.destroy();

    if (!containers.size) {
      return;
    }

    stopping = true;

    console.log(`\nreceived canncel request, stopping running containers.....`);

    const jobs = [];

    for (let container of containers) {
      try {
        if (container.destroy) { // container stream
          container.destroy();
        } else {
          const c = docker.getContainer(container);
          console.log(`stopping container ${container}`);

          jobs.push(c.kill().catch(ex => debug('kill container instance error, error is', ex)));
        }
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

  return () => {
    process.stdin.removeListener('keypress', kpCallBack);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(isRaw);
    }
  };
}

const goThrough = waitingForContainerStopped();

const {
  generateVscodeDebugConfig, generateDebugEnv
} = require('./debug');

// todo: add options for pull latest image
const skipPullImage = true;

async function resolveNasConfigToMounts(baseDir, serviceName, nasConfig, nasBaseDir) {
  const nasMappings = await nas.convertNasConfigToNasMappings(nasBaseDir, nasConfig, serviceName);
  return convertNasMappingsToMounts(getRootBaseDir(baseDir), nasMappings);
}

async function resolveTmpDirToMount(absTmpDir) {
  if (!absTmpDir) { return {}; }
  return {
    Type: 'bind',
    Source: absTmpDir,
    Target: '/tmp',
    ReadOnly: false
  };
}

async function resolveDebuggerPathToMount(debuggerPath) {
  if (!debuggerPath) { return {}; }
  const absDebuggerPath = path.resolve(debuggerPath);
  return {
    Type: 'bind',
    Source: absDebuggerPath,
    Target: '/tmp/debugger_files',
    ReadOnly: false
  };
}

// todo: 当前只支持目录以及 jar。code uri 还可能是 oss 地址、目录、jar、zip?
async function resolveCodeUriToMount(absCodeUri, readOnly = true) {
  if (!absCodeUri) {
    return null;
  }
  let target = null;

  const stats = await fs.lstat(absCodeUri);

  if (stats.isDirectory()) {
    target = '/code';
  } else {
    // could not use path.join('/code', xxx)
    // in windows, it will be translate to \code\xxx, and will not be recorgnized as a valid path in linux container
    target = path.posix.join('/code', path.basename(absCodeUri));
  }

  // Mount the code directory as read only
  return {
    Type: 'bind',
    Source: absCodeUri,
    Target: target,
    ReadOnly: readOnly
  };
}

async function resolvePasswdMount() {
  if (process.platform === 'linux') {
    return {
      Type: 'bind',
      Source: await generatePwdFile(),
      Target: '/etc/passwd',
      ReadOnly: true
    };
  }

  return null;
}

function convertNasMappingsToMounts(baseDir, nasMappings) {
  return nasMappings.map(nasMapping => {
    // console.log('mounting local nas mock dir %s into container %s\n', nasMapping.localNasDir, nasMapping.remoteNasDir);
    return {
      Type: 'bind',
      Source: path.resolve(baseDir, nasMapping.localNasDir),
      Target: nasMapping.remoteNasDir,
      ReadOnly: false
    };
  });
}

async function resolveNasYmlToMount(baseDir, serviceName) {
  const nasMappings = await extractNasMappingsFromNasYml(baseDir, serviceName);
  return convertNasMappingsToMounts(getRootBaseDir(baseDir), nasMappings);
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

async function listContainers(options) {
  return await docker.listContainers(options);
}

async function getContainer(containerId) {
  return await docker.getContainer(containerId);
}

async function renameContainer(container, name) {
  return await container.rename({
    name
  });
}

function genDockerCmdOfCustomContainer(functionProps) {
  const command = functionProps.CustomContainerConfig.Command ? JSON.parse(functionProps.CustomContainerConfig.Command) : undefined;
  const args = functionProps.CustomContainerConfig.Args ? JSON.parse(functionProps.CustomContainerConfig.Args) : undefined;

  if (command && args) {
    return [...functionProps.CustomContainerConfig.Command, ...functionProps.CustomContainerConfig.Args];
  } else if (command) {
    return command;
  } else if (args) {
    return args;
  }
  return [];
}
function genDockerCmdOfNonCustomContainer(functionProps, httpMode, invokeInitializer = true, event = null) {
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

// dockerode exec 在 windows 上有问题，用 exec 的 stdin 传递事件，当调用 stream.end() 时，会直接导致 exec 退出，且 ExitCode 为 null
function generateDockerCmd(runtime, isLocalStartInit, { functionProps, httpMode, invokeInitializer = true, event = null }) {
  if (isCustomContainerRuntime(runtime)) {
    return genDockerCmdOfCustomContainer(functionProps);
  } else if (isLocalStartInit) {
    return ['--server'];
  }
  return genDockerCmdOfNonCustomContainer(functionProps, httpMode, invokeInitializer, event);
}


function followProgress(stream, onFinished) {

  const barLines = {};

  const onProgress = (event) => {
    let status = event.status;

    if (event.progress) {
      status = `${event.status} ${event.progress}`;
    }

    if (event.id) {
      const id = event.id;

      if (!barLines[id]) {
        barLines[id] = console.draft();
      }
      barLines[id](id + ': ' + status);
    } else {
      if (_.has(event, 'aux.ID')) {
        event.stream = event.aux.ID + '\n';
      }
      // If there is no id, the line should be wrapped manually.
      const out = event.status ? event.status + '\n' : event.stream;
      process.stdout.write(out);
    }
  };

  docker.modem.followProgress(stream, onFinished, onProgress);
}

async function pullImage(imageName) {

  const resolveImageName = await dockerOpts.resolveImageNameForPull(imageName);

  // copied from lib/edge/container.js
  const startTime = new Date();

  const stream = await docker.pull(resolveImageName);

  const visitor = await getVisitor();

  visitor.event({
    ec: 'image',
    ea: 'pull',
    el: 'start'
  }).send();

  const registry = await dockerOpts.resolveDockerRegistry();

  return await new Promise((resolve, reject) => {

    console.log(`begin pulling image ${resolveImageName}, you can also use ` + yellow(`'docker pull ${resolveImageName}'`) + ' to pull image by yourself.');

    const onFinished = async (err) => {

      containers.delete(stream);

      const pullDuration = parseInt((new Date() - startTime) / 1000);
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

      for (const r of dockerOpts.DOCKER_REGISTRIES) {
        if (resolveImageName.indexOf(r) === 0) {
          const image = await docker.getImage(resolveImageName);

          const newImageName = resolveImageName.slice(r.length + 1);
          const repoTag = newImageName.split(':');

          // rename
          await image.tag({
            name: resolveImageName,
            repo: _.first(repoTag),
            tag: _.last(repoTag)
          });
          break;
        }
      }
      resolve(resolveImageName);
    };

    containers.add(stream);
    // pull image progress
    followProgress(stream, onFinished);
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

async function generateDockerfileEnvs(baseDir, serviceName, serviceProps, functionName, functionProps, debugPort, httpParams, nasConfig, ishttpTrigger, debugIde, debugArgs) {
  const DockerEnvs = await generateDockerEnvs(baseDir, serviceName, serviceProps, functionName, functionProps, debugPort, httpParams, nasConfig, ishttpTrigger, debugIde, debugArgs);
  const DockerfilEnvs = [];
  Object.keys(DockerEnvs).forEach((key) => {
    DockerfilEnvs.push(`${key}=${DockerEnvs[key]}`);
  });
  return DockerfilEnvs;
}

async function generateDockerEnvs(baseDir, serviceName, serviceProps, functionName, functionProps, debugPort, httpParams, nasConfig, ishttpTrigger, debugIde, debugArgs) {
  const envs = {};

  if (httpParams) {
    Object.assign(envs, {
      'FC_HTTP_PARAMS': httpParams
    });
  }

  const confEnv = await resolveLibPathsFromLdConf(baseDir, functionProps.CodeUri);

  Object.assign(envs, confEnv);

  const runtime = functionProps.Runtime;

  if (debugPort && !debugArgs) {
    const debugEnv = generateDebugEnv(runtime, debugPort, debugIde);

    Object.assign(envs, debugEnv);
  } else if (debugArgs) {
    Object.assign(envs, {
      DEBUG_OPTIONS: debugArgs
    });
  }

  if (ishttpTrigger && (runtime === 'java8' || runtime === 'java11')) {
    envs['fc_enable_new_java_ca'] = 'true';
  }

  Object.assign(envs, generateFunctionEnvs(functionProps));

  const profile = await getProfile();

  Object.assign(envs, {
    'local': true,
    'FC_ACCESS_KEY_ID': profile.accessKeyId,
    'FC_ACCESS_KEY_SECRET': profile.accessKeySecret,
    'FC_SECURITY_TOKEN': profile.securityToken,
    'FC_ACCOUND_ID': profile.accountId,
    'FC_REGION': profile.defaultRegion,
    'FC_FUNCTION_NAME': functionName,
    'FC_HANDLER': functionProps.Handler,
    'FC_MEMORY_SIZE': functionProps.MemorySize || 128,
    'FC_TIMEOUT': functionProps.Timeout || 3,
    'FC_INITIALIZER': functionProps.Initializer,
    'FC_INITIALIZATIONTIMEOUT': functionProps.InitializationTimeout || 3,
    'FC_SERVICE_NAME': serviceName,
    'FC_SERVICE_LOG_PROJECT': ((serviceProps || {}).LogConfig || {}).Project,
    'FC_SERVICE_LOG_STORE': ((serviceProps || {}).LogConfig || {}).Logstore
  });

  if (isCustomContainerRuntime(functionProps.Runtime)) {
    return envs;
  }
  return addEnv(envs, nasConfig);
}


async function pullImageIfNeed(imageName) {
  const exist = await imageExist(imageName);

  if (!exist || !skipPullImage) {

    await pullImage(imageName);
  } else {
    debug(`skip pulling image ${imageName}...`);
    console.log(`skip pulling image ${imageName}...`);
  }
}

async function showDebugIdeTipsForVscode(serviceName, functionName, runtime, codeSource, debugPort) {
  const vscodeDebugConfig = await generateVscodeDebugConfig(serviceName, functionName, runtime, codeSource, debugPort);

  // todo: auto detect .vscode/launch.json in codeuri path.
  console.log(blue('you can paste these config to .vscode/launch.json, and then attach to your running function'));
  console.log('///////////////// config begin /////////////////');
  console.log(JSON.stringify(vscodeDebugConfig, null, 4));
  console.log('///////////////// config end /////////////////');
}

async function showDebugIdeTipsForPycharm(codeSource, debugPort) {

  const stats = await fs.lstat(codeSource);

  if (!stats.isDirectory()) {
    codeSource = path.dirname(codeSource);
  }

  console.log(yellow(`\n========= Tips for PyCharm remote debug =========
Local host name: ${ip.address()}
Port           : ${yellow(debugPort)}
Path mappings  : ${yellow(codeSource)}=/code

Debug Code needed to copy to your function code:

import pydevd
pydevd.settrace('${ip.address()}', port=${debugPort}, stdoutToServer=True, stderrToServer=True)

=========================================================================\n`));
}

function writeEventToStreamAndClose(stream, event) {

  if (event) {
    stream.write(event);
  }

  stream.end();
}

async function isDockerToolBoxAndEnsureDockerVersion() {

  const dockerInfo = await docker.info();

  await detectDockerVersion(dockerInfo.ServerVersion || '');

  const obj = (dockerInfo.Labels || []).map(e => _.split(e, '=', 2))
    .filter(e => e.length === 2)
    .reduce((acc, cur) => (acc[cur[0]] = cur[1], acc), {});

  return process.platform === 'win32' && obj.provider === 'virtualbox';
}

async function runContainer(opts, outputStream, errorStream, context = {}) {
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

  const errorTransform = processorTransformFactory({
    serviceName: context.serviceName,
    functionName: context.functionName,
    errorStream: errorStream
  });

  if (!isWin) {
    container.modem.demuxStream(stream, outputStream, errorTransform);
  }

  await container.start();

  // dockerode bugs on windows. attach could not receive output and error
  if (isWin) {
    const logStream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true
    });

    container.modem.demuxStream(logStream, outputStream, errorTransform);
  }

  containers.add(container.id);

  return { 
    container,
    stream
  };
}

async function exitContainer(container) {
  if (container) {
    // exitRs format: {"Error":null,"StatusCode":0}
    // see https://docs.docker.com/engine/api/v1.37/#operation/ContainerStop
    console.log('exitContainer...');
    await container.stop();

    containers.delete(container.id);
    console.log(green('container exited!'));
  } else {
    throw new Error(red('Exited container is undefined!'));
  }
}

async function run(opts, event, outputStream, errorStream, context = {}) {

  const { container, stream } = await runContainer(opts, outputStream, errorStream, context);

  writeEventToStreamAndClose(stream, event);

  // exitRs format: {"Error":null,"StatusCode":0}
  // see https://docs.docker.com/engine/api/v1.37/#operation/ContainerWait
  const exitRs = await container.wait();

  containers.delete(container.id);

  return exitRs;
}


async function createContainer(opts) {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  if (opts && isMac) {
    if (opts.HostConfig) {
      const pathsOutofSharedPaths = await findPathsOutofSharedPaths(opts.HostConfig.Mounts);
      if (isMac && pathsOutofSharedPaths.length > 0) {
        throw new Error(red(`Please add directory '${pathsOutofSharedPaths}' to Docker File sharing list, more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`));
      }
    }
  }
  const dockerToolBox = await isDockerToolBoxAndEnsureDockerVersion();

  let container;
  try {
    // see https://github.com/apocas/dockerode/pull/38
    container = await docker.createContainer(opts);
  } catch (ex) {

    if (ex.message.indexOf('invalid mount config for type') !== -1 && dockerToolBox) {
      throw new Error(red(`The default host machine path for docker toolbox is under 'C:\\Users', Please make sure your project is in this directory. If you want to mount other disk paths, please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md .`));
    }
    if (ex.message.indexOf('drive is not shared') !== -1 && isWin) {
      throw new Error(red(`${ex.message}More information please refer to https://docs.docker.com/docker-for-windows/#shared-drives`));
    }
    throw ex;
  }
  return container;
}

async function createAndRunContainer(opts) {
  const container = await createContainer(opts);
  containers.add(container.id);
  await container.start({});
  return container;
}

async function execContainer(container, opts, outputStream, errorStream) {
  outputStream = process.stdout;
  errorStream = process.stderr;
  const logStream = await container.logs({
    stdout: true,
    stderr: true,
    follow: true,
    since: (new Date().getTime() / 1000)
  });
  container.modem.demuxStream(logStream, outputStream, errorStream);
  const exec = await container.exec(opts);
  const stream = await exec.start();
  // have to wait, otherwise stdin may not be readable
  await new Promise(resolve => setTimeout(resolve, 30));
  container.modem.demuxStream(stream, outputStream, errorStream);

  await waitForExec(exec);
  logStream.destroy();
}

async function waitForExec(exec) {
  return await new Promise((resolve, reject) => {
    // stream.on('end') could not receive end event on windows.
    // so use inspect to check exec exit
    function waitContainerExec() {
      exec.inspect((err, data) => {
        if (data.Running) {
          setTimeout(waitContainerExec, 100);
          return;
        }
        if (err) {
          reject(err);
        } else if (data.ExitCode !== 0) {
          reject(`${data.ProcessConfig.entrypoint} exited with code ${data.ExitCode}`);
        } else {
          resolve(data.ExitCode);
        }
      });
    }
    waitContainerExec();
  });
}

// outputStream, errorStream used for http invoke
// because agent is started when container running and exec could not receive related logs
async function startContainer(opts, outputStream, errorStream, context = {}) {

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

    container.modem.demuxStream(logStream, outputStream, processorTransformFactory({
      serviceName: context.serviceName,
      functionName: context.functionName,
      errorStream
    }));
  }

  return {
    stop: async () => {
      await container.stop();
      containers.delete(container.id);
    },

    exec: async (cmd, { cwd = '', env = {}, outputStream, errorStream, verbose = false, context = {}, event = null } = {}) => {
      const stdin = event ? true : false;

      const options = {
        Env: dockerOpts.resolveDockerEnv(env),
        Tty: false,
        AttachStdin: stdin,
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: cwd
      };
      if (cmd !== []) {
        options.Cmd = cmd;
      }

      // docker exec
      debug('docker exec opts: ' + JSON.stringify(options, null, 4));

      const exec = await container.exec(options);

      const stream = await exec.start({ hijack: true, stdin });

      // todo: have to wait, otherwise stdin may not be readable
      await new Promise(resolve => setTimeout(resolve, 30));

      if (event !== null) {
        writeEventToStreamAndClose(stream, event);
      }

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

      return await waitForExec(exec);
    }
  };
}

async function startInstallationContainer({ runtime, imageName, codeUri, targets, context }) {
  debug(`runtime: ${runtime}`);
  debug(`codeUri: ${codeUri}`);

  if (await isDockerToolBoxAndEnsureDockerVersion()) {
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
  const passwdMount = await resolvePasswdMount();
  const mounts = _.compact([codeMount, ...installMounts, passwdMount]);

  await pullImageIfNeed(imageName);

  const envs = addInstallTargetEnv({}, targets);
  const opts = dockerOpts.generateInstallOpts(imageName, mounts, envs);

  return await startContainer(opts);
}

function displaySboxTips(runtime) {
  console.log(yellow(`\nWelcom to fun sbox environment.\n`));
  console.log(yellow(`You can install system dependencies like this:`));
  console.log(yellow(`fun-install apt-get install libxss1\n`));

  switch (runtime) {
  case 'nodejs6':
  case 'nodejs8':
  case 'nodejs10':
  case 'nodejs12':
    console.log(yellow(`You can install node modules like this:`));
    console.log(yellow(`fun-install npm install puppeteer\n`));
    break;
  case 'python2.7':
  case 'python3':
    console.log(yellow(`You can install pip dependencies like this:`));
    console.log(yellow(`fun-install pip install flask`));
    break;
  default:
    break;
  }
  console.log(yellow('type \'fun-install --help\' for more help\n'));
}

async function startSboxContainer({
  runtime, imageName,
  mounts, cmd, envs,
  isTty, isInteractive
}) {
  debug(`runtime: ${runtime}`);
  debug(`mounts: ${mounts}`);
  debug(`isTty: ${isTty}`);
  debug(`isInteractive: ${isInteractive}`);

  if (!imageName) {
    imageName = await dockerOpts.resolveRuntimeToDockerImage(runtime, true);
    if (!imageName) {
      throw new Error(`invalid runtime name ${runtime}`);
    }
  }

  debug(`cmd: ${parseArgsStringToArgv(cmd || '')}`);

  const container = await createContainer(dockerOpts.generateSboxOpts({
    imageName,
    hostname: `fc-${runtime}`,
    mounts,
    envs,
    cmd: parseArgsStringToArgv(cmd || ''),
    isTty,
    isInteractive
  }));

  containers.add(container.id);

  await container.start();

  const stream = await container.attach({
    logs: true,
    stream: true,
    stdin: isInteractive,
    stdout: true,
    stderr: true
  });

  // show outputs
  let logStream;
  if (isTty) {
    stream.pipe(process.stdout);
  } else {
    if (isInteractive || process.platform === 'win32') {
      // 这种情况很诡异，收不到 stream 的 stdout，使用 log 绕过去。
      logStream = await container.logs({
        stdout: true,
        stderr: true,
        follow: true
      });
      container.modem.demuxStream(logStream, process.stdout, process.stderr);
    } else {
      container.modem.demuxStream(stream, process.stdout, process.stderr);
    }

  }

  if (isInteractive) {
    displaySboxTips(runtime);

    // Connect stdin
    process.stdin.pipe(stream);

    let previousKey;
    const CTRL_P = '\u0010', CTRL_Q = '\u0011';

    process.stdin.on('data', (key) => {
      // Detects it is detaching a running container
      const keyStr = key.toString('ascii');
      if (previousKey === CTRL_P && keyStr === CTRL_Q) {
        container.stop(() => { });
      }
      previousKey = keyStr;
    });

  }

  let resize;

  const isRaw = process.isRaw;
  if (isTty) {
    // fix not exit process in windows
    goThrough();

    process.stdin.setRawMode(true);

    resize = async () => {
      const dimensions = {
        h: process.stdout.rows,
        w: process.stdout.columns
      };

      if (dimensions.h !== 0 && dimensions.w !== 0) {
        await container.resize(dimensions);
      }
    };

    await resize();
    process.stdout.on('resize', resize);

    // 在不加任何 cmd 的情况下 shell prompt 需要输出一些字符才会显示，
    // 这里输入一个空格+退格，绕过这个怪异的问题。
    stream.write(' \b');
  }

  await container.wait();

  // cleanup
  if (isTty) {
    process.stdout.removeListener('resize', resize);
    process.stdin.setRawMode(isRaw);
  }

  if (isInteractive) {
    process.stdin.removeAllListeners();
    process.stdin.unpipe(stream);

    /**
     *  https://stackoverflow.com/questions/31716784/nodejs-process-never-ends-when-piping-the-stdin-to-a-child-process?rq=1
     *  https://github.com/nodejs/node/issues/2276
     * */
    process.stdin.destroy();
  }

  if (logStream) {
    logStream.removeAllListeners();
  }

  stream.unpipe(process.stdout);

  // fix not exit process in windows
  // stream is hackji socks,so need to close
  stream.destroy();

  containers.delete(container.id);

  if (!isTty) {
    goThrough();
  }
}

async function zipTo(archive, to) {

  await fs.ensureDir(to);

  await new Promise((resolve, reject) => {
    archive.pipe(tar.extract(to)).on('error', reject).on('finish', resolve);
  });
}

async function copyFromImage(imageName, from, to) {
  const container = await docker.createContainer({
    Image: imageName
  });

  const archive = await container.getArchive({
    path: from
  });

  await zipTo(archive, to);

  await container.remove();
}

function buildImage(dockerBuildDir, dockerfilePath, imageTag) {

  return new Promise((resolve, reject) => {
    var tarStream = tar.pack(dockerBuildDir);

    docker.buildImage(tarStream, {
      dockerfile: path.relative(dockerBuildDir, dockerfilePath),
      t: imageTag
    }, (error, stream) => {
      containers.add(stream);

      if (error) {
        reject(error);
        return;
      }
      stream.on('error', (e) => {
        containers.delete(stream);
        reject(e);
        return;
      });
      stream.on('end', function () {
        containers.delete(stream);
        resolve(imageTag);
        return;
      });

      followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
    });
  });
}

async function detectDockerVersion(serverVersion) {
  let cur = serverVersion.split('.');
  // 1.13.1
  if (Number.parseInt(cur[0]) === 1 && Number.parseInt(cur[1]) <= 13) {
    throw new Error(red(`\nWe detected that your docker version is ${serverVersion}, for a better experience, please upgrade the docker version.`));
  }
}

module.exports = {
  imageExist, generateDockerCmd,
  pullImage,
  resolveCodeUriToMount, generateFunctionEnvs, run, generateRamdomContainerName,
  generateDockerEnvs, pullImageIfNeed, generateDockerfileEnvs,
  showDebugIdeTipsForVscode, resolveNasConfigToMounts,
  startInstallationContainer, startContainer, isDockerToolBoxAndEnsureDockerVersion,
  conventInstallTargetsToMounts, startSboxContainer, buildImage, copyFromImage,
  resolveTmpDirToMount, showDebugIdeTipsForPycharm, resolveDebuggerPathToMount,
  listContainers, getContainer, createAndRunContainer, execContainer,
  renameContainer, detectDockerVersion, resolveNasYmlToMount, resolvePasswdMount, runContainer, exitContainer
};
