'use strict';

const findit = require('findit2');
const debug = require('debug')('fun:install');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { red, green, cyan } = require('colors');

const { installPackage, installFromYaml } = require('../install/install');
const { FunModule, FunTask } = require('../install/module');
const { addEnv } = require('../install/env');
const getVisitor = require('../visitor').getVisitor;
const { getSupportedRuntimes } = require('../common/model/runtime');
const sbox = require('../install/sbox');
const { findFunctionInTpl } = require('../definition');
const { detectTplPath, getTpl} = require('../tpl');
const validate = require('../validate/validate');

async function findYamlFiles(dir) {
  return new Promise((resolve, reject) => {
    let yamlFiles = [];
    findit(dir).on('directory', (subdir, stat, stop, linkPath) => {
      var base = path.basename(subdir);
      if (['.git', 'node_modules', '.fun', '.vscode'].includes(base)) {
        stop();
      } else {
        let ymlPath = path.join(subdir, 'fun.yml');
        if (fs.existsSync(ymlPath)) {
          yamlFiles.push(ymlPath);
        }
      }
    }).on('end', () => resolve(yamlFiles))
      .on('error', (err) => reject(err));
  });
}

async function installAll(funcPath, { verbose }) {

  if (!funcPath) {
    const dir = process.cwd();
    const yamlFiles = await findYamlFiles(dir);
    for (let ymlPath of yamlFiles) {
      console.log();
      console.log('Installing recursively on %s', cyan(path.relative(dir, ymlPath)));
      console.log();
      await installFromYaml(ymlPath, verbose);
    }
  } else {
    const functionRes = await getFunctionRes(funcPath);
    const dir = await getCodeUri(functionRes);
    const ymlPath = path.join(dir, 'fun.yml');
    if (fs.existsSync(ymlPath)) {
      console.log();
      console.log(`Installing '${cyan(ymlPath)}' for function '${green(funcPath)}'`);
      console.log();
      await installFromYaml(ymlPath, verbose);
    } else {
      throw new Error('Can\'t find \'fun.yml\' in current dir.');
    }
  }
}

async function getFunctionRes(funcPath) {

  if (funcPath) {
    const tplPath = await detectTplPath(false);
    if (!tplPath || !path.basename(tplPath).startsWith('template')) {
      throw new Error(`Error: Can't find template file at ${process.cwd()}.`);
    }

    await validate(tplPath);

    const tpl = await getTpl(tplPath);

    const {functionRes} = findFunctionInTpl(funcPath, tpl);

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

  const ymlPath = path.join(codeUri, 'fun.yml');

  var funModule;
  if (fs.existsSync(ymlPath)) {
    funModule = FunModule.load(ymlPath);
  } else {
    funModule = new FunModule(runtime);
  }

  for (const pkg of packages) {
    switch (pkgType) {
    case 'pip':
      funModule.addTask(new FunTask('pip', {
        pip: pkg,
        local: true,
        env
      }));
      break;
    case 'apt':
      funModule.addTask(new FunTask('apt', {
        apt: pkg,
        local: true,
        env
      }));
      break;
    default:
      console.error('unknown task %s => %s', pkgType, pkg);
    }
  }

  FunModule.store(ymlPath, funModule);
  debug(`save to ${ymlPath}`);

}

async function install(packages, options) {
  const visitor = await getVisitor();
  visitor.pageview('/fun/install').send();

  const functionRes = await getFunctionRes(options.function);
  const codeUri = await getCodeUri(functionRes);

  const runtime = getRuntime(codeUri, functionRes, options);
  debug(`runtime: ${runtime}`);
  const pkgType = options.packageType;
  debug(`packageType: ${pkgType}`);

  for (const pkg of packages) {
    await installPackage(runtime, codeUri, pkgType, pkg, options);
  }

  if (options.save) {
    await save(runtime, codeUri, pkgType, packages, options.env);
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

  const funModule = new FunModule(answers.runtime);
  FunModule.store('./fun.yml', funModule);

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