'use strict';

const inquirer = require('inquirer');
const fs = require('fs');
const { isEmpty, isArray } = require('lodash/lang');
const { sync } = require('rimraf');
const debug = require('debug')('fun:prompt');

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

async function promptForExistingPath(path, message) {
  if (!fs.existsSync(path)) {
    return;
  }
  const answers = await inquirer.prompt([{
    type: 'confirm',
    name: 'okToDelete',
    message: message
  }]);
  if (answers.okToDelete) {
    try {
      sync(path);
    } catch (err) {
      throw new Error(`Failed to delete file or folder: ${path}, error is: ${err}`);
    }
  } else {
    process.exit(-1);
  }
}

async function promptForTemplate(templates) {
  return inquirer.prompt([{
    type: 'autocomplete',
    name: 'template',
    message: 'Select a tempalte to init',
    pageSize: 16,
    source: async (answersForFar, input) => {
      input = input || '';
      return templates.filter(t => t.toLowerCase().includes(input.toLowerCase()));
    }
  }]).then(answers => {
    return answers.template;
  });
}



module.exports = { promptForConfig, promptForExistingPath, promptForTemplate };