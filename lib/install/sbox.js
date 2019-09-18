'use strict';

const {
  startSboxContainer,
  pullImageIfNeed,
  resolveNasConfigToMounts,
  resolveCodeUriToMount
} = require('../docker');
const { resolveRuntimeToDockerImage } = require('../docker-opts');
const definition = require('../definition');
const { detectTplPath, getTpl } = require('../tpl');
const { red } = require('colors');
const path = require('path');

async function sbox(options) {
  const funcPath = options.function;
  const cmd = options.cmd;
  const envs = options.envs;
  const isInteractive = options.interactive;
  const isTty = isInteractive && process.stdin.isTTY || false;

  let codeUri, runtime = options.runtime, mounts = [];

  if (funcPath) {
    let tplPath = await detectTplPath(false);
    if (!tplPath) {
      console.error(red('The `template.yml` file is not found in current directory.'));
      return;
    }
    const tpl = await getTpl(tplPath);

    const { functionRes, serviceName, serviceRes } = definition.findFunctionInTpl(funcPath, tpl);

    if (functionRes) {
      codeUri = functionRes.Properties.CodeUri;

      if (!runtime) {
        runtime = functionRes.Properties.Runtime;
      }
    }

    const nasConfig = (serviceRes.Properties || {}).NasConfig;
    mounts = await resolveNasConfigToMounts(serviceName, nasConfig, process.cwd());
  } else if (options.runtime) {
    codeUri = process.cwd();
  }

  mounts.push(await resolveCodeUriToMount(path.resolve(codeUri), false));

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