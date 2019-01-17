'use strict';

// const findit = require('findit2');
const debug = require('debug')('fun:install');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { red, green, cyan } = require('colors');

const { installPackage, installFromYaml } = require('../install/install');
const { FunModule, FunTask } = require('../install/module');
const { addEnv } = require('../install/env');


async function installAll({ recursive, verbose }) {
  const cd = process.cwd();
  const ymlPath = path.join(cd, 'fun.yml');

  if (!recursive) {
    if (fs.existsSync(ymlPath)) {
      installFromYaml(ymlPath, verbose);
    } else {
      console.error('Can\'t find \'fun.yml\' in current dir.');
      return;
    }
  } else {
    //TODO
    console.error('option `--recurive` is unsupported now.');
    return;
    // const finder = findit(cd, { followSymlinks: 'true' });

    // finder.on('directory', function (dir, stat, stop, linkPath) {

    // });
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

async function save(runtime, codeUri, pkgType, packages) {
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
          local: true
        }));
        break;
      case 'apt':
        funModule.addTask(new FunTask('apt', {
          apt: pkg,
          local: true
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
  const runtime = getRuntime(options);
  debug(`runtime: ${runtime}`);
  const pkgType = options.packageType;
  debug(`packageType: ${pkgType}`);

  for (const pkg of packages) {
    await installPackage(runtime, pkgType, pkg, options);
  }

  if (options.save) {
    await save(runtime, options.codeUri, pkgType, packages);
  }
}

async function init() {

  if (fs.existsSync('./fun.yml')) {
    console.error("fun.yml already exist.");
    return
  }

  const answers = await inquirer.prompt([{
    type: 'list',
    message: 'Select a runtime',
    name: 'runtime',
    choices: ['python2.7', 'python3', 'nodejs6', 'nodejs8', 'java8', 'php7.2']
  }]);

  const funModule = new FunModule(answers.runtime);
  FunModule.store('./fun.yml', funModule);
}

function env() {
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
};