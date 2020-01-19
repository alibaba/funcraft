'use strict';
const fs = require('fs-extra');
const path = require('path');
const definition = require('../definition');

const { readLines } = require('../utils/file');
const { resolveMountPoint } = require('../nas');

const _ = require('lodash');

const paths = ['/usr/local/bin', '/usr/local/sbin', '/usr/bin', '/usr/sbin', '/sbin', '/bin'];

function addEnv(envVars, nasConfig) {
  const envs = Object.assign({}, envVars);

  const prefix = '/code/.fun/root';

  envs['LD_LIBRARY_PATH'] = generatePathToDynamicLibrary(envs, prefix);
  envs['PATH'] = generatePathToExecutable(envs, prefix);

  const defaultPythonPath = '/code/.fun/python';
  if (!envs['PYTHONUSERBASE']) {
    envs['PYTHONUSERBASE'] = defaultPythonPath;
  }

  if (nasConfig) {
    return appendNasEnvs(envs, nasConfig);
  }

  return envs;
}

function generatePathToDynamicLibrary(envs, prefix) {
  const defaultLibPath = `${generateDefaultLibPath(prefix)}:/code:/code/lib:/usr/local/lib`;

  let LD_LIBRARY_PATH;
  if (envs['LD_LIBRARY_PATH']) {
    LD_LIBRARY_PATH = `${envs['LD_LIBRARY_PATH']}:${defaultLibPath}`;
  } else {
    LD_LIBRARY_PATH = defaultLibPath;
  }
  return duplicateRemoval(LD_LIBRARY_PATH);
}

function generatePathToExecutable(envs, prefix) {
  const defaultPath = paths.join(':');
  const customPath = paths.map(p => `${prefix}${p}`).join(':') + ':/code/.fun/python/bin';

  let path;
  if (envs['PATH']) {
    path = `${envs['PATH']}:${customPath}:${defaultPath}`;
  } else {
    path = `${customPath}:${defaultPath}`;
  }
  return duplicateRemoval(path);
}

function duplicateRemoval(str) {
  const spliceValue = str.split(':');
  return _.union(spliceValue).join(':');
}


function generateDefaultLibPath(prefix) {
  return [`${prefix}/usr/lib`, `${prefix}/usr/lib/x86_64-linux-gnu`, `${prefix}/lib/x86_64-linux-gnu`, `${prefix}/usr/lib64`].join(':');
}

// This method is only used for fun install target attribue.
//
// In order to be able to use the dependencies installed in the previous step,
// such as the model serving example, fun need to configure the corresponding environment variables
// so that the install process can go through.
//
// However, if the target specifies a directory other than nas, code,
// it will not be successful by deploy, so this is an implicit rule.
//
// For fun-install, don't need to care about this rule because it has Context information for nas.
// Fun will set all environment variables before fun-install is executed.
function addInstallTargetEnv(envVars, targets) {
  const envs = Object.assign({}, envVars);

  if (!targets) { return envs; }

  _.forEach(targets, (target) => {

    const { containerPath } = target;

    const prefix = containerPath;

    const pythonPaths = ['/python/lib/python2.7/site-packages', '/python/lib/python3.6/site-packages'];

    const targetPathonPath = pythonPaths.map(p => `${prefix}${p}`).join(':');

    if (envs['PYTHONPATH']) {
      envs['PYTHONPATH'] = `${envs['PYTHONPATH']}:${targetPathonPath}`;
    } else {
      envs['PYTHONPATH'] = targetPathonPath;
    }
  });

  return envs;
}
function appendNasEnvs(envs, nasConfig) {
  const isNasAuto = definition.isNasAutoConfig(nasConfig);
  var nasEnvs;
  if (isNasAuto) {
    const mountDir = '/mnt/auto';
    nasEnvs = appendNasMountPointEnv(envs, mountDir);
  } else {
    const mountPoints = nasConfig.MountPoints;
    _.forEach(mountPoints, (mountPoint) => {
      const { mountDir } = resolveMountPoint(mountPoint);
      nasEnvs = appendNasMountPointEnv(envs, mountDir);
    });
  }
  return nasEnvs;
}
function appendNasMountPointEnv(envs, prefix) {

  const pythonPaths = ['/python/lib/python2.7/site-packages', '/python/lib/python3.6/site-packages'];

  const customNasPath = paths.map(p => `${prefix}${p}`).join(':');

  envs['PATH'] = `${envs['PATH']}:${customNasPath}`;
  envs['LD_LIBRARY_PATH'] = `${envs['LD_LIBRARY_PATH']}:${generateDefaultLibPath(prefix)}`;

  const nasPythonPath = pythonPaths.map(p => `${prefix}${p}`).join(':');

  if (envs['PYTHONPATH']) {
    envs['PYTHONPATH'] = `${envs['PYTHONPATH']}:${nasPythonPath}`;
  } else {
    envs['PYTHONPATH'] = nasPythonPath;
  }

  // todo: add other runtime envs
  return envs;
}

async function resolveLibPathsFromLdConf(baseDir, codeUri) {
  const envs = {};

  const confdPath = path.resolve(baseDir, codeUri, '.fun/root/etc/ld.so.conf.d');

  if (! await fs.pathExists(confdPath)) { return envs; }

  const stats = await fs.lstat(confdPath);

  if (stats.isFile()) { return envs; }

  const libPaths = await resolveLibPaths(confdPath);

  if (!_.isEmpty(libPaths)) {

    envs['LD_LIBRARY_PATH'] = libPaths.map(path => `/code/.fun/root${path}`).join(':');
  }
  return envs;
}

async function resolveLibPaths(confdPath) {
  if (!fs.existsSync(confdPath)) {
    return [];
  }
  const confLines = await Promise.all(
    fs.readdirSync(confdPath, 'utf-8')
      .filter(f => f.endsWith('.conf'))
      .map(async f => await readLines(path.join(confdPath, f))));

  return _.flatten(confLines)
    .reduce((lines, line) => {
      // remove the first and last blanks and leave only the middle
      const found = line.match(/^\s*(\/.*)\s*$/);
      if (found && found[1].startsWith('/')) {

        lines.push(found[1]);
      }
      return lines;
    }, []);
}

module.exports = {
  addEnv, addInstallTargetEnv, resolveLibPathsFromLdConf, generateDefaultLibPath
};