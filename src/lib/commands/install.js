'use strict';

const fs = require('fs-extra');
const path = require('path');
const sbox = require('../install/sbox');
const inquirer = require('inquirer');
const validate = require('../validate/validate');
const debug = require('debug')('fun:install');
const getVisitor = require('../visitor').getVisitor;

const { red, green, cyan } = require('colors');
const { buildFunction, getOrConvertFunfile } = require('../build/build');
const { resolveEnv } = require('../build/parser');
const { FunModule } = require('../install/module');
const { addEnv } = require('../install/env');
const { getSupportedRuntimes } = require('../common/model/runtime');
const { findFunctionInTpl } = require('../definition');
const { detectTplPath, getTpl, validateTplName } = require('../tpl');
const { showInstallNextTips } = require('../build/tips');

const _ = require('lodash');

async function installAll(funcPath, { verbose, useDocker, useBuildkit }) {
  const tplPath = await detectTplPath(false);

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  validateTplName(tplPath);

  await validate(tplPath);

  const tpl = await getTpl(tplPath);
  const baseDir = path.dirname(tplPath);

  await buildFunction(funcPath, tpl, baseDir, useDocker, useBuildkit, ['install'], verbose);

  showInstallNextTips();
}

async function getFunctionRes(funcPath) {
  if (funcPath) {
    const tplPath = await detectTplPath(false);
    if (!tplPath || !path.basename(tplPath).startsWith('template')) {
      throw new Error(`Error: Can't find template file at ${process.cwd()}.`);
    }

    await validate(tplPath);

    const tpl = await getTpl(tplPath);
    const { functionRes } = findFunctionInTpl(funcPath, tpl);
    if (!functionRes) {
      throw new Error(`Error: function ${funcPath} not found in ${tplPath}`);
    }
    return functionRes;
  }
  return undefined;
}

async function getCodeUri(functionRes) {
  if (functionRes) {
    if (functionRes.Properties && functionRes.Properties.CodeUri) {
      return path.resolve(functionRes.Properties.CodeUri);
    }
    throw new Error(`Error: can not find CodeUri in function`);
  }
  return process.cwd();
}

function getRuntime(codeUri, functionRes, options) {
  let moduleRuntime;

  if (fs.existsSync(path.join(codeUri, 'fun.yml'))) {
    moduleRuntime = FunModule.load(path.join(codeUri, 'fun.yml')).runtime;
  }

  if (options.runtime) {
    if (moduleRuntime && options.runtime !== moduleRuntime) {
      throw new Error(red(`'${options.runtime}' specified by --runtime option doesn't match the one in fun.yml.`));
    }
    return options.runtime;
  } else if (options.function) {
    if (functionRes && functionRes.Properties && functionRes.Properties.Runtime) {
      if (moduleRuntime) {
        if (functionRes.Properties.Runtime !== moduleRuntime) {
          throw new Error(red(`'runtime' in template.yml and fun.yml is not equal`));
        }
      }
      return functionRes.Properties.Runtime;
    }
  } else if (moduleRuntime) {
    return moduleRuntime;
  }
  throw new Error(red('\'runtime\' is missing, you should specify it by --runtime option.'));
}

async function save(runtime, codeUri, pkgType, packages, env) {

  let funfilePath = await getOrConvertFunfile(codeUri);
  let cmds = [];

  if (!funfilePath) {
    funfilePath = path.join(codeUri, 'Funfile');
    cmds.push(`RUNTIME ${runtime}`);
  }

  let resolvedEnv = resolveEnv(env).join(' ');
  if (!_.isEmpty(resolvedEnv)) {
    resolvedEnv = ' ' + resolvedEnv;
  }

  console.log(`\nsave package install commnad to ${funfilePath}`);

  for (const pkg of packages) {
    const cmd = await convertPackageToCmd(pkgType === 'apt' ? 'apt-get' : pkgType, pkg);
    cmds.push(`RUN${resolvedEnv} ${cmd}`);
  }

  await fs.appendFile(funfilePath, `\n${cmds.join('\n')}\n`);
}

function convertPackageToCmd(pkgType, pkg, {
  indexUrl, registry
} = {}) {

  if (!_.includes(['pip', 'npm', 'apt-get'], pkgType)) {
    throw new Error(`unknow package type %${pkgType}`);
  }

  const defaultCmd = `fun-install ${pkgType} install ${pkg}`;

  if (indexUrl) {
    return `${defaultCmd} --index-url ${indexUrl}`;
  }

  if (registry) {
    return `${defaultCmd} --registry ${registry}`;
  }

  return defaultCmd;
}

function validateRegistry(runtime, options) {
  if (options.indexUrl && options.registry) {
    throw new Error(`'--index-url' and '--registry' cannot be specified together.`);
  }

  if (options.indexUrl && !(runtime.indexOf('python') > -1)) {
    throw new Error(`'--index-url' needs to be used with '--runtime' python2.7/python3.6, and you are currently using ${runtime}`);
  }

  if (options.registry && !(runtime.indexOf('node') > -1)) {
    throw new Error(`'--registry' needs to be used with '--runtime' nodejs6/nodejs8/nodejs10/nodejs12, and you are currently using ${runtime}`);
  }
}

async function install(packages, options) {
  const visitor = await getVisitor();
  visitor.pageview('/fun/install').send();

  const functionRes = await getFunctionRes(options.function);
  const codeUri = await getCodeUri(functionRes);

  const runtime = getRuntime(codeUri, functionRes, options);
  debug(`runtime: ${runtime}`);

  validateRegistry(runtime, options);

  const pkgType = options.packageType;
  debug(`packageType: ${pkgType}`);

  const env = options.env;
  for (const pkg of packages) {
    const cmd = convertPackageToCmd(pkgType === 'apt' ? 'apt-get' : pkgType, pkg, options);
    await sbox({
      function: options.function,
      cmd,
      envs: env,
      interactive: false,
      runtime
    });
  }

  if (options.save) {
    await save(runtime, codeUri, pkgType, packages, env);
  }

  visitor.event({
    ec: 'install',
    ea: 'install',
    el: 'success',
    dp: '/fun/install'
  }).send();
}

async function init() {

  if (fs.existsSync('./fun.yml')) {
    console.error('fun.yml already exist.');
    return;
  }

  const answers = await inquirer.prompt([{
    type: 'list',
    message: 'Select a runtime',
    name: 'runtime',
    choices: getSupportedRuntimes()
  }]);

  const funfilePath = path.join(process.cwd(), 'Funfile');

  await fs.writeFile(funfilePath, `RUNTIME ${answers.runtime}`);

  return answers.runtime;
}

async function env() {

  const envs = addEnv({});
  for (let [key, val] of Object.entries(envs)) {
    console.log(`${green(key)}=${cyan(val)}`);
  }
}

module.exports = {
  install,
  installAll,
  init,
  env,
  sbox
};
