'use strict';

const fs = require('fs-extra');
const path = require('path');
const debug = require('debug')('fun:local');

const validate = require('../../validate/validate');

const definition = require('../../definition');
const fc = require('../../fc');
const { getDebugPort, getDebugIde } = require('../../debug');

const { detectTplPath, getTpl } = require('../../tpl');
const { getEvent } = require('../../utils/file');
const { red, yellow } = require('colors');

async function localInvoke(invokeName, tpl, debugPort, event, debugIde, baseDir, tmpDir) {
  debug(`invokeName: ${invokeName}`);

  if (!invokeName) {

    invokeName = definition.findFirstFunction(tpl);
    
    console.log('invokeName is: ' + invokeName);

    if (!invokeName) {
      throw new Error(red(`Missing function definition in template.yml`)); 
    }
    
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

  const absTmpDir = tmpDir ? path.resolve(tmpDir) : path.resolve(baseDir, '.fun', 'tmp', 'invoke', serviceName, functionName);

  await ensureTmpDir(absTmpDir);

  // Lazy loading to avoid stdin being taken over twice.
  const LocalInvoke = require('../../local/local-invoke');
  const localInvoke = new LocalInvoke(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, absTmpDir);

  await localInvoke.invoke(event);
}

async function ensureTmpDir(absTmpDir) {

  if (await fs.pathExists(absTmpDir)) {

    const stats = await fs.lstat(absTmpDir);

    if (stats.isFile()) {

      throw new Error(red(`'${absTmpDir}' should be a directory.`));
    }
  } else {

    await fs.ensureDir(absTmpDir);
  }
}

async function invoke(invokeName, options) {

  let tplPath = options.template;

  if (!tplPath) {
    tplPath = await detectTplPath();
  }

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  } else if (path.basename(tplPath).startsWith('template')) {

    await validate(tplPath);

    const tpl = await getTpl(tplPath);

    const event = await getEvent(options.event);

    debug('event content: ' + event);

    const debugPort = getDebugPort(options);

    const debugIde = getDebugIde(options);

    const baseDir = path.dirname(tplPath);

    await localInvoke(invokeName, tpl, debugPort, event, debugIde, baseDir, options.tmpDir);
  } else {
    throw new Error(red('The template file name must be template.[yml|yaml].'));
  }
}

module.exports = { invoke };
