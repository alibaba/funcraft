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

async function installAll(dir, { recursive, verbose }) {
  if (recursive) {
    const yamlFiles = await findYamlFiles(dir);
    for (let ymlPath of yamlFiles) {
      console.log('install on %s', cyan(path.relative(dir, ymlPath)));
      await installFromYaml(ymlPath, verbose);
    }
  } else {
    let ymlPath = path.join(dir, 'fun.yml');
    if (fs.existsSync(ymlPath)) {
      await installFromYaml(ymlPath, verbose);
    } else {
      console.error('Can\'t find \'fun.yml\' in current dir.');
      return;
    }
  }
}


function getRuntime(options) {
  let moduleRuntime;

  if (fs.existsSync('./fun.yml')) {
    moduleRuntime = FunModule.load('./fun.yml').runtime;
  }

  if (options.runtime) {
    if (moduleRuntime && options.runtime !== moduleRuntime) {
      throw new Error(red(`'${options.runtime}' specified by --runtime option doesn't match the one in fun.yml.`));
    }
    return options.runtime;
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

  const runtime = getRuntime(options);
  debug(`runtime: ${runtime}`);
  const pkgType = options.packageType;
  debug(`packageType: ${pkgType}`);

  for (const pkg of packages) {
    await installPackage(runtime, pkgType, pkg, options);
  }

  if (options.save) {
    await save(runtime, options.codeUri, pkgType, packages, options.env);
  }

  visitor.event({
    ec: 'install',
    ea: 'install',
    el: 'success',
    dp: '/fun/install'
  }).send();
}

async function init() {
  const visitor = await getVisitor();
  visitor.pageview('/fun/install/init').send();

  if (fs.existsSync('./fun.yml')) {
    console.error('fun.yml already exist.');
    return;
  }

  const answers = await inquirer.prompt([{
    type: 'list',
    message: 'Select a runtime',
    name: 'runtime',
    choices: ['python2.7', 'python3', 'nodejs6', 'nodejs8', 'java8', 'php7.2']
  }]);
  
  visitor.event({
    ec: 'install',
    ea: `init ${answers.runtime}`,
    el: 'success',
    dp: '/fun/install/init'
  }).send();

  const funModule = new FunModule(answers.runtime);
  FunModule.store('./fun.yml', funModule);
}

async function env() {
  const visitor = await getVisitor();
  visitor.pageview('/fun/install/env').send();

  const envs = addEnv({});
  for (let [key, val] of Object.entries(envs)) {
    console.log(`${green(key)}=${cyan(val)}`);
  }

  visitor.event({
    ec: 'install',
    ea: 'env',
    el: 'success',
    dp: '/fun/install'
  }).send();
}

module.exports = {
  install,
  installAll,
  init,
  env,
};