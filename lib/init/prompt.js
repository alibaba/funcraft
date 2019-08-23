'use strict';

const inquirer = require('inquirer');
const fs = require('fs');
const { isEmpty, isArray } = require('lodash/lang');
const { sync } = require('rimraf');
const debug = require('debug')('fun:prompt');

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

async function promptForFunctionSelection(functions) {

  const choicesFuntions = functions.map(func => {
      
    return func.serviceName + '/' + func.functionName;
  });

  return inquirer.prompt([
    {
      type: 'list',
      message: 'Select a function?',
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

module.exports = {
  promptForConfig, 
  promptForExistingPath, 
  promptForTemplate, 
  promptForFunctionSelection
};
