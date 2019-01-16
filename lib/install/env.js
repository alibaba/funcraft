'use strict';

function addEnv(envVars) {
  const envs = Object.assign({}, envVars);
  const prefix = '/code/.fun/root';

  if (envs['LD_LIBRARY_PATH']) {
    envs['LD_LIBRARY_PATH'] = `${prefix}/usr/lib/x86_64-linux-gnu:${envs['LD_LIBRARY_PATH']}`;
  } else {
    envs['LD_LIBRARY_PATH'] = `${prefix}/usr/lib/x86_64-linux-gnu:/code:/code/lib:/usr/local/lib`;
  }

  const paths = ['/usr/local/bin', '/usr/local/sbin', '/usr/bin', '/usr/sbin', '/sbin', '/bin'];
  const defaultPath = paths.join(':');
  const customPath = paths.map(p => `${prefix}${p}`).join(':');
  if (envs['PATH']) {
    envs['PATH'] = `${customPath}:${envs['PATH']}`;
  } else {
    envs['PATH'] = `${customPath}:${defaultPath}`;
  }

  const pythonRuntimes = ['python2.7', 'python3'];
  const pythonPath = pythonRuntimes.map(r => `/code/.fun/python/lib/${r}/site-packages`).join(':');
  if (envs['PYTHONPATH']) {
    envs['PYTHONPATH'] = `${pythonPath}:${envs['PYTHONPATH']}`;
  } else {
    envs['PYTHONPATH'] = `${pythonPath}`;
  }

  return envs;
}

module.exports = {
  addEnv
};