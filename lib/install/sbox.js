'use strict';

const { startSboxContainer, pullImageIfNeed } = require('../docker');
const { resolveRuntimeToDockerImage } = require('../docker-opts');
const definition = require('../definition');
const { detectTplPath, getTpl } = require('../tpl');

async function sbox(options) {
  const funcPath = options.function;
  const cmd = options.cmd;
  const envs = options.envs;
  const isInteractive = options.interactive;
  const isTty = isInteractive && process.stdin.isTTY || false;

  let codeUri, runtime = options.runtime;

  if(funcPath){
    let tplPath = await detectTplPath();
    const tpl = await getTpl(tplPath);

    const {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl(funcPath, tpl);

    if(!functionRes){
      codeUri = functionRes.Properties.CodeUri;

      if(!runtime){
        runtime = functionRes.Properties.Runtime;
      }
    }
  }

  const imageName = await resolveRuntimeToDockerImage(runtime, true);

  await pullImageIfNeed(imageName);

  await startSboxContainer({
    runtime,
    imageName,
    codeUri,
    cmd,
    envs,
    isTty,
    isInteractive
  });
}

module.exports = sbox;