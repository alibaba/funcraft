'use strict';

const {
  startSboxContainer,
  pullImageIfNeed,
  resolveNasConfigToMounts,
  resolveCodeUriToMount
} = require('../docker');
const { resolveRuntimeToDockerImage } = require('../docker-opts');
const definition = require('../definition');
const { detectTplPath, getTpl, validateYmlName } = require('../tpl');
const { addEnv } = require('../install/env');
const { red } = require('colors');
const path = require('path');
const nas = require('../nas');

async function sbox(options) {
  const funcPath = options.function;
  const cmd = options.cmd;
  let envs = options.envs;
  const isInteractive = options.interactive;
  const isTty = isInteractive && process.stdin.isTTY || false;
  let tplPath = options.template, codeUri, runtime = options.runtime, mounts = [];

  if (funcPath) {

    if (!tplPath) {
      tplPath = await detectTplPath(false);
    }

    if (!tplPath) {
      console.error(red('The `template.yml` file is not found in current directory.'));
      return;
    }

    validateYmlName(tplPath);
    
    const baseDir = path.resolve(path.dirname(tplPath));
    const tpl = await getTpl(tplPath);

    const { functionRes, serviceName, serviceRes } = definition.findFunctionInTpl(funcPath, tpl);

    if (functionRes) {
      codeUri = path.resolve(baseDir, functionRes.Properties.CodeUri);

      if (!runtime) {
        runtime = functionRes.Properties.Runtime;
      }
    }

    const nasConfig = (serviceRes.Properties || {}).NasConfig;
    mounts = await resolveNasConfigToMounts(serviceName, nasConfig, nas.getDefaultNasDir(baseDir));
    envs = addEnv(envs, nasConfig); 
  } else if (options.runtime) {
    codeUri = process.cwd();
  }

  mounts.push(await resolveCodeUriToMount(codeUri, false));

  const imageName = await resolveRuntimeToDockerImage(runtime, true);

  await pullImageIfNeed(imageName);

  await startSboxContainer({
    runtime,
    imageName,
    mounts,
    cmd,
    envs,
    isTty,
    isInteractive
  });
}

module.exports = sbox;