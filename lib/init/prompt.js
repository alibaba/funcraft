'use strict';

const inquirer = require('inquirer');
const fs = require('fs-extra');
const { isEmpty, isArray } = require('lodash/lang');
const { sync } = require('rimraf');
const debug = require('debug')('fun:prompt');
const detectMocha = require('detect-mocha');
const _ = require('lodash');

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

async function promptForConfig(context) {
  let userPrompt = context.config.userPrompt;

  if (isEmpty(userPrompt)) {
    return;
  }
  if (!isArray(userPrompt)) {
    userPrompt = [userPrompt];
  }
  const questions = userPrompt.filter(q => !(q.name in context.vars));
  if (isEmpty(questions)) {
    return;
  }
  if (context.input) {
    debug('Config Need prompt.');
    Object.assign(context.vars, await inquirer.prompt(questions));
  } else {
    debug('Config does not need prompt.');
    const defaultVars = {};
    questions.forEach(q => {
      defaultVars[q.name] = q.default;
    });
    context.vars = Object.assign(defaultVars, context.vars);
  }

}

async function promptForExistingPath(path, message, deleted) {
  if (!fs.existsSync(path)) {
    return;
  }
  const stat = fs.statSync(path);
  if (stat.isDirectory()) {
    const files = fs.readdirSync(path);
    if (isEmpty(files)) {
      return;
    }
  }

  const answers = await inquirer.prompt([{
    type: 'confirm',
    name: 'ok',
    message: message
  }]);
  if (answers.ok) {
    try {
      if (deleted === true) {
        sync(path);
      }
    } catch (err) {
      throw new Error(`Failed to delete file or folder: ${path}, error is: ${err}`);
    }
  } else {
    throw new Error(); // equal to process.exit(-1);
  }
}

async function promptForTemplate(templates) {
  return inquirer.prompt([{
    type: 'autocomplete',
    name: 'template',
    message: 'Select a template to init',
    pageSize: 16,
    source: async (answersForFar, input) => {
      input = input || '';
      return templates.filter(t => t.toLowerCase().includes(input.toLowerCase()));
    }
  }]).then(answers => {
    return answers.template;
  });
}

async function promptForFunctionSelection(functions, message = 'select a function?') {
  const choicesFuntions = functions.map(func => {
    return func.serviceName + '/' + func.functionName;
  });
  return inquirer.prompt([
    {
      type: 'list',
      message,
      name: 'function',
      choices: choicesFuntions
    }
  ]).then(answers => {
    const splitFunc = _.split(answers.function, '/');
    return {
      serviceName: _.first(splitFunc),
      functionName: _.last(splitFunc)
    };
  });
}

function isInteractiveEnvironment() {
  return process.stdin.isTTY;
}

async function promptForConfirmContinue(message) {
  if (!isInteractiveEnvironment()) { return true; }
  if (detectMocha()) { return true; }

  const answers = await inquirer.prompt([{
    type: 'confirm',
    name: 'ok',
    message
  }]);

  if (answers.ok) {
    return true;
  }
  return false;
}

async function promptForInputContinue(message, defaultValue) {

  const answers = await inquirer.prompt([{
    type: 'input',
    name: 'input',
    message,
    default: defaultValue
  }]);

  return answers;
}

async function promptForDebugaHttptriggers(httpTriggers, message = 'select a function to debug?') {
  const choicesFuntions = httpTriggers.map(httpTrigger => {
    if (httpTrigger.path) {
      return httpTrigger.path + ':' + httpTrigger.serviceName + '/' + httpTrigger.functionName;
    }
    return httpTrigger.serviceName + '/' + httpTrigger.functionName;
  });
  return inquirer.prompt([
    {
      type: 'list',
      message,
      name: 'function',
      choices: choicesFuntions
    }
  ]).then(answers => {

    let path;
    let slashSplit;

    const colonSplit = _.split(answers.function, ':');
    if (colonSplit.length !== 1) {
      slashSplit = _.split(colonSplit[1], '/');
      path = colonSplit[0];
    } else {
      slashSplit = _.split(answers.function, '/');
    }
    return {
      path,
      serviceName: _.first(slashSplit),
      functionName: _.last(slashSplit)
    };
  });
}

async function promptForMountTargets(mountTargets) {

  const choices = mountTargets.map(m => `(MountTargetDomain)${m.MountTargetDomain}, (VpcId)${m.VpcId}, (VswId)${m.VswId}, (AccessGroupName)${m.AccessGroupName}`);

  return await inquirer.prompt([
    {
      type: 'list',
      message: 'select or confirm mountTargets?',
      name: 'mountTargetDomain',
      choices,
      filter: val => {
        const colonSplit = _.split(val, ',');
        return _.trimStart(colonSplit[0], '(MountTargetDomain)');
      }
    }
  ]);
}

async function promptForFileSystems(fileSystems) {

  let choicesNas = fileSystems.map(m => `(FileSystemId)${m.fileSystemId}, (Description)${m.description}, (StorageType)${m.storageType}, (Availability Zone)${m.zoneId}`);

  return await inquirer.prompt([{
    type: 'list',
    message: 'select a nas service?',
    name: 'fileSystemId',
    choices: choicesNas,
    filter: (val) => {
      const colonSplit = _.split(val, ',');
      return _.trimStart(colonSplit[0], '(FileSystemId)');
    }
  }]);
}

async function promptForMountPoints(mountPoints) {

  const choicesNas = mountPoints.map(m => `(ServerAddr)${m.ServerAddr},(MountDir)${m.MountDir}`);

  return await inquirer.prompt([{
    type: 'list',
    message: 'select a nas service?',
    name: 'mountDir',
    choices: choicesNas,
    filter: (val) => {
      const colonSplit = _.split(val, ',');
      return _.trimStart(colonSplit[1], '(MountDir)');
    }
  }]);
}

async function promptForSecurityGroup(securityGroups) {

  const securityGroupsChoices = securityGroups.map(m => `(SecurityGroupId)${m.SecurityGroupId},(SecurityGroupName)${m.SecurityGroupName},(Description)${m.Description}`);

  return await inquirer.prompt([{
    type: 'list',
    message: 'select a security group?',
    name: 'securityGroupId',
    choices: securityGroupsChoices,
    filter: (val) => {
      const colonSplit = _.split(val, ',');
      return _.trimStart(colonSplit[0], '(SecurityGroupId)');
    }
  }]);
}

module.exports = {
  promptForConfig,
  promptForExistingPath,
  promptForTemplate,
  promptForFunctionSelection,
  promptForConfirmContinue,
  promptForDebugaHttptriggers,
  promptForMountPoints,
  promptForMountTargets,
  promptForFileSystems,
  promptForSecurityGroup,
  promptForInputContinue
};
