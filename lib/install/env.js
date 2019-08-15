'use strict';
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const definition = require('../definition');

const _ = require('lodash');

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
    return addNasEnv(envs, nasConfig);
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

function addNasEnv(envs, nasConfig) {

  const prefix = '/mnt/auto';
  
  const pythonPaths = ['/python/lib/python2.7/site-packages', '/python/lib/python3.6/site-packages'];

  const isNasAuto = definition.isNasAutoConfig(nasConfig);

  if (isNasAuto) {
    const customNasPath = paths.map(p => `${prefix}${p}`).join(':');

    envs['PATH'] = `${envs['PATH']}:${customNasPath}`; 
    envs['LD_LIBRARY_PATH'] = `${envs['LD_LIBRARY_PATH']}:${prefix}/usr/lib:${prefix}/usr/lib/x86_64-linux-gnu`;

    const nasPathonPath = pythonPaths.map(p => `${prefix}${p}`).join(':');

    if (envs['PYTHONPATH']) {  
      envs['PYTHONPATH'] = `${envs['PYTHONPATH']}:${nasPathonPath}`;
    } else {
      envs['PYTHONPATH'] = nasPathonPath;
    }

    // todo: add other runtime envs
  } else {
    // todo: add support
  }

  return envs;
}

async function resolveLibPathsFromLdConf(baseDir, codeUri) {

  const envs = {};

  const libPaths = await readAllConfFileContents(baseDir, codeUri);

  if (!_.isEmpty(libPaths)) {

    const addPrefix = _.compact(libPaths).map(path => {
      return `/code/.fun/root${path}`;
    });
    
    envs['LD_LIBRARY_PATH'] = addPrefix.map(path => `/code/.fun/root${path}`).join(':');
  }

  return envs;
}

async function readAllConfFileContents(baseDir, codeUri) {

  const confdPath = path.join(baseDir, codeUri, '.fun/root/etc/ld.so.conf.d');
 
  if (!fs.existsSync(confdPath)) {
    return [];
  }

  const confFiles = await fs.readdirSync(confdPath).filter(f => f.endsWith('.conf'));

  let collector = [];
  for (const file of confFiles) {

    const lines = await readLines(path.join(confdPath, file));

    collector = _.concat(collector, lines);
  }

  return collector.map(line => {

    const found = line.match(/^\s*(\/.*)\s*$/);

    if (found && found[1].startsWith('/')) {

      return found[1];
    }
  });
}

function readLines(fileName) {
  return new Promise((resolve, reject) => {
    const lines = [];

    let reader = readline.createInterface({
      input: fs.createReadStream(fileName)
    });

    reader.on('line', (line) => {
      lines.push(line);
    });
    reader.on('close', () => {
      resolve(lines);
    });
    reader.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = {
  addEnv, addInstallTargetEnv, resolveLibPathsFromLdConf
};