'use strict';

function addEnv(envVars) {
  const envs = Object.assign({}, envVars);
  const prefix = '/code/.fun/root';

  const libPath = [`${prefix}/usr/lib`, `${prefix}/usr/lib/x86_64-linux-gnu`].join(':');
  const defaultLibPath = `${libPath}:/code:/code/lib:/usr/local/lib`;
  if (envs['LD_LIBRARY_PATH']) {
    envs['LD_LIBRARY_PATH'] = `${envs['LD_LIBRARY_PATH']}:${defaultLibPath}`;
  } else {
    envs['LD_LIBRARY_PATH'] = defaultLibPath;
  }

  const paths = ['/usr/local/bin', '/usr/local/sbin', '/usr/bin', '/usr/sbin', '/sbin', '/bin'];
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

  return envs;
}

module.exports = {
  addEnv
};