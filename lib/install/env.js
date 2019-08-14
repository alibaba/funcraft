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

async function resolvePrefixConfForEnv(baseDir, codeUri) {

  let envs = {};

  const confContents = await readAllConfFileContents(baseDir, codeUri);

  if (!_.isEmpty(confContents)) {

    const addPrefix = confContents.map(path => {
      return `/code/.fun/root${path}`;
    });

    envs['LD_LIBRARY_PATH'] = _.join(addPrefix, ':');
  }
  return envs;
}

async function readAllConfFileContents(baseDir, codeUri) {

  const detectionPath = path.join(baseDir, codeUri, '.fun/root/etc/ld.so.conf.d');
 
  if (!fs.existsSync(detectionPath)) {
    return [];
  }

  const files = fs.readdirSync(detectionPath, 'utf-8');

  if (_.isEmpty(files)) {
    return [];
  } 

  let collect = [];

  for (let f of files) {

    if (f.endsWith('.conf')) {

      const fileContent = await readFileToArr(path.join(detectionPath, f));

      const filterFileContent = fileContent.filter(line => {

        return line.replace(/^\s/, '').startsWith('/');
      });

      collect = _.concat(collect, filterFileContent);
    }
  }
  return collect;
}

function readFileToArr(fReadName) {
  return new Promise((resolve, reject) => {

    let arr = [];

    let readObj = readline.createInterface({
      input: fs.createReadStream(fReadName)
    });

    readObj.on('line', (line) => {
      arr.push(line);
    });
    readObj.on('close', () => {
      resolve(arr);
    });
  });
}

module.exports = {
  addEnv, addInstallTargetEnv, resolvePrefixConfForEnv
};