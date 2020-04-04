'use strict';

const _ = require('lodash');
const fc = require('../../fc');
const path = require('path');
const debug = require('debug')('fun:local');
const definition = require('../../definition');

const { red, yellow } = require('colors');
const { ensureTmpDir } = require('../../utils/path');
const { getDebugPort, getDebugIde } = require('../../debug');
const { ensureFilesModified, eventPriority } = require('../../utils/file');
const { generateMergedTpl, detectNasBaseDir } = require('../../tpl');
const { mergeTplWithoutBuildYml, transformDotnetCodeUri } = require('./util');

function findFunctionInTpl(invokeName, tpl) {
  const { serviceName, serviceRes, functionName, functionRes } = definition.findFunctionInTpl(invokeName, tpl);
  if (!functionRes) {
    throw new Error(red(`invokeName ${invokeName} is invalid`));
  }
  return {
    serviceName,
    serviceRes,
    functionName,
    functionRes
  };
}

async function invoke(invokeName, options) {
  let isDotnetcore = false;
  let tpl, tplPath;
  let serviceName, serviceRes, functionName, functionRes, codeUri, runtime;
  const hasInvokeName = !!invokeName;

  // 判断是否是 Debug Mode
  // 如果是 Debug Mode 且指定了 dotnetcore 函数，需要以 Debug Config 发布代码
  if (options.debugPort) {
    ({
      isDotnetcore,
      tpl, tplPath,
      serviceName, serviceRes,
      functionName, functionRes
    } = await mergeTplWithoutBuildYml(options.template, invokeName));
  }
  if (isDotnetcore) {
    console.log(yellow(`using template: ${path.relative(process.cwd(), tplPath)}`));
    const baseDir = path.resolve(path.dirname(tplPath));
    await transformDotnetCodeUri(baseDir, serviceName, functionName, functionRes);
    if (!hasInvokeName) {
      invokeName = `${serviceName}/${functionName}`;
    }
  } else {
    ({ tpl, tplPath } = await generateMergedTpl(options.template, true));
    if (!hasInvokeName) {
      invokeName = definition.findFirstFunctionName(tpl);
    }
    ({ serviceName, serviceRes, functionName, functionRes } = findFunctionInTpl(invokeName, tpl));
  }

  if (!hasInvokeName) {
    console.log(`\nMissing invokeName argument, Fun will use the first function ${yellow(invokeName)} as invokeName\n`);
  }

  const event = await eventPriority(options);
  debug('event content: ' + event);

  const debugPort = getDebugPort(options);
  const debugIde = getDebugIde(options);

  const debuggerPath = options.debuggerPath;
  const debugArgs = options.debugArgs;

  const baseDir = path.resolve(path.dirname(tplPath));
  const reuse = options.reuse;

  const nasBaseDir = detectNasBaseDir(tplPath);

  await ensureFilesModified(tplPath);

  codeUri = functionRes.Properties.CodeUri;
  runtime = functionRes.Properties.Runtime;
  await fc.detectLibrary(codeUri, runtime, baseDir, functionName);

  debug(`found serviceName: ${serviceName}, functionName: ${functionName}, functionRes: ${functionRes}`);

  // env 'DISABLE_BIND_MOUNT_TMP_DIR' to disable bind mount of tmp dir.
  // libreoffice will be failed if /tmp directory is bind mount by docker.
  // dotnetcore runtime local run will be failed if /tmp directory is bind mount by docker in win.
  let absTmpDir;
  if (isDotnetcoreRuntime(runtime)) {
    if (isFalseValue(process.env.DISABLE_BIND_MOUNT_TMP_DIR)) {
      absTmpDir = await ensureTmpDir(options.tmpDir, tplPath, serviceName, functionName);
    }
  } else if (!process.env.DISABLE_BIND_MOUNT_TMP_DIR
    || isFalseValue(process.env.DISABLE_BIND_MOUNT_TMP_DIR)
  ) {
    absTmpDir = await ensureTmpDir(options.tmpDir, tplPath, serviceName, functionName);
  }

  debug(`The temp directory mounted to /tmp is ${absTmpDir || 'null'}`);

  // Lazy loading to avoid stdin being taken over twice.
  const LocalInvoke = require('../../local/local-invoke');
  const localInvoke = new LocalInvoke(
    serviceName, serviceRes,
    functionName, functionRes,
    debugPort, debugIde,
    baseDir, absTmpDir,
    debuggerPath, debugArgs,
    reuse, nasBaseDir
  );

  await localInvoke.invoke(event);
}

function isDotnetcoreRuntime(runtime) {
  return runtime.indexOf('dotnetcore') > -1;
}

function isFalseValue(val) {
  return val && (_.toLower(val) === 'false' || val === '0');
}

module.exports = { invoke };
