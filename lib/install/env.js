'use strict';

const definition = require('../definition');
const _ = require('lodash');
const { resolveMountPoint } = require('../nas');
const paths = ['/usr/local/bin', '/usr/local/sbin', '/usr/bin', '/usr/sbin', '/sbin', '/bin'];

function addEnv(envVars, nasConfig) {
  const envs = Object.assign({}, envVars);
  const prefix = '/code/.fun/root';

  const libPath = [`${prefix}/usr/lib`, `${prefix}/usr/lib/x86_64-linux-gnu`].join(':');
  const defaultLibPath = `${libPath}:/code:/code/lib:/usr/local/lib`;
  if (envs['LD_LIBRARY_PATH']) {
    envs['LD_LIBRARY_PATH'] = `${envs['LD_LIBRARY_PATH']}:${defaultLibPath}`;
  } else {
    envs['LD_LIBRARY_PATH'] = defaultLibPath; 
  }

  const defaultPath = paths.join(':');
  const customPath = paths.map(p => `${prefix}${p}`).join(':') + ':/code/.fun/python/bin';
  if (envs['PATH']) {
    envs['PATH'] = `${envs['PATH']}:${customPath}:${defaultPath}`;
  } else {
    envs['PATH'] = `${customPath}:${defaultPath}`;
  }

  if (!envs['PYTHONUSERBASE']) {
    envs['PYTHONUSERBASE']='/code/.fun/python';
  }

  if (nasConfig) {
    return appendNasEnvs(envs, nasConfig);
  }
  
  return envs;
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
  envs['LD_LIBRARY_PATH'] = `${envs['LD_LIBRARY_PATH']}:${prefix}/usr/lib:${prefix}/usr/lib/x86_64-linux-gnu`;

  const nasPythonPath = pythonPaths.map(p => `${prefix}${p}`).join(':');

  if (envs['PYTHONPATH']) {
    envs['PYTHONPATH'] = `${envs['PYTHONPATH']}:${nasPythonPath}`;
  } else {
    envs['PYTHONPATH'] = nasPythonPath;
  }

  // todo: add other runtime envs

  return envs;
}

module.exports = {
  addEnv, addInstallTargetEnv
};