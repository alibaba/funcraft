'use strict';

const fc = require('../../fc');
const path = require('path');
const debug = require('debug')('fun:local');
const validate = require('../../validate/validate');
const definition = require('../../definition');

const { getEvent } = require('../../utils/file');
const { red, yellow } = require('colors');
const { ensureTmpDir } = require('../../utils/path');
const { getDebugPort, getDebugIde } = require('../../debug');
const { detectTplPath, getTpl, validateYmlName, detectNasBaseDir } = require('../../tpl');

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

  const absTmpDir = await ensureTmpDir(tmpDir, tplPath, serviceName, functionName);

  // Lazy loading to avoid stdin being taken over twice.
  const LocalInvoke = require('../../local/local-invoke');
  const localInvoke = new LocalInvoke(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, absTmpDir, debuggerPath, debugArgs, reuse, nasBaseDir);

  await localInvoke.invoke(event);
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
