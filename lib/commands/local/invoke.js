'use strict';

const fs = require('fs-extra');
const path = require('path');
const debug = require('debug')('fun:local');
const validate = require('../../validate/validate');
const definition = require('../../definition');
const fc = require('../../fc');
const { getDebugPort, getDebugIde } = require('../../debug');
const { detectTplPath, getTpl, validateYmlName, detectNasBaseDir, detectTmpDir } = require('../../tpl');
const { getEvent } = require('../../utils/file');
const { red, yellow } = require('colors');

async function localInvoke(invokeName, tplPath, tpl, debugPort, event, debugIde, baseDir, tmpDir, debuggerPath, debugArgs, reuse = true, nasBaseDir) {
  debug(`invokeName: ${invokeName}`);

  if (!invokeName) {

    invokeName = definition.findFirstFunctionName(tpl);
    
    console.log(`\nMissing invokeName argument, Fun will use the first function ${yellow(invokeName)} as invokeName\n`);
  }

  const {serviceName, serviceRes, functionName, functionRes} = definition.findFunctionInTpl(invokeName, tpl);

  if (!functionRes) {
    throw new Error(red(`invokeName ${invokeName} is invalid`));
  }
  const codeUri = functionRes.Properties.CodeUri;
  const runtime = functionRes.Properties.Runtime;
  await fc.detectLibrary(codeUri, runtime, baseDir, functionName);

  debug(`found serviceName: ${serviceName}, functionName: ${functionName}, functionRes: ${functionRes}`);

  const absTmpDir = tmpDir ? path.resolve(tmpDir) : path.resolve(detectTmpDir(tplPath), serviceName, functionName);

  await ensureTmpDir(absTmpDir);

  // Lazy loading to avoid stdin being taken over twice.
  const LocalInvoke = require('../../local/local-invoke');
  const localInvoke = new LocalInvoke(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, absTmpDir, debuggerPath, debugArgs, reuse, nasBaseDir);

  await localInvoke.invoke(event);
}

async function ensureTmpDir(absTmpDir) {

  if (await fs.pathExists(absTmpDir)) {

    const stats = await fs.lstat(absTmpDir);

    if (stats.isFile()) {
      throw new Error(red(`'${absTmpDir}' should be a directory.`));
    }
  } else {
    await fs.ensureDir(absTmpDir, {
      mode: parseInt('0777', 8)
    });
  }
}

async function invoke(invokeName, options) {

  let tplPath = options.template;

  if (!tplPath) {
    tplPath = await detectTplPath();
  }

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  validateYmlName(tplPath);

  await validate(tplPath);

  const tpl = await getTpl(tplPath);

  const event = await getEvent(options.event);
  debug('event content: ' + event);
  
  const debugPort = getDebugPort(options);
  const debugIde = getDebugIde(options);

  const debuggerPath = options.debuggerPath;
  const debugArgs = options.debugArgs;

  const baseDir = path.resolve(path.dirname(tplPath));
  const reuse = options.reuse;
  
  const nasBaseDir = detectNasBaseDir(tplPath);

  await localInvoke(invokeName, tplPath, tpl, debugPort, event, debugIde, baseDir, options.tmpDir, debuggerPath, debugArgs, reuse, nasBaseDir);
}

module.exports = { invoke };
