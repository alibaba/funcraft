
'use strict';

const { getConfig } = require('./config');
const { promptForConfig, promptForExistingPath } = require('./prompt');
const templateSettings = require('lodash/templateSettings');
const { renderContent } = require('./renderer');
const fs = require('fs-extra');
const path = require('path');

const debug = require('debug')('fun:context');

function isTemplated(dirname) {
  if (templateSettings.interpolate.test(dirname)) {
    return true;
  }
  return false;
}

function findTemplate(repoDir) {
  debug(`Searching ${ repoDir } for project template.`);

  const files = fs.readdirSync(repoDir);
  let templateDir = '';
  files.forEach(file => {
    if (isTemplated(file)) {
      templateDir = file;
      return false;
    }
  });
  if (templateDir) {
    return templateDir;
  }
  throw new Error('Non template input dir.');
}

function doBuildPaths(paths) {
  if (typeof paths === 'string') {
    return paths;
  } else if (paths instanceof Array) {
    return paths.join('\n');
  }
  throw Error(`The ${ typeof paths } type not supported.`);
}

async function buildContext(repoDir, context) {
  if (context.name) {
    context.vars.projectName = context.name;
  } else {
    let name = path.basename(path.resolve(context.outputDir));
    if (!name) {
      name = 'fun-app';
    } else {
      context.outputDir = path.join(context.outputDir, '..');
    }
    context.vars.projectName = name;
  }
  context.repoDir = repoDir;

  const templateDir = findTemplate(repoDir);
  context.templateDir = templateDir;
  const renderedDir = renderContent(templateDir, context);
  const fullTargetDir = path.resolve(context.outputDir, renderedDir);
  await fs.ensureDir(path.resolve(context.outputDir));
  debug(`Generating project to ${ fullTargetDir }...`);
  await promptForExistingPath(fullTargetDir, `You've created ${fullTargetDir} before. Is it okay to override it?`);

  const config = getConfig(context);
  context.config = config;
  if (context.config.copyOnlyPaths) {
    context.config.copyOnlyPaths = doBuildPaths(context.config.copyOnlyPaths);
  }
  if (context.config.ignorePaths) {
    context.config.ignorePaths = doBuildPaths(context.config.ignorePaths);
  }
  context.vars = Object.assign(config.vars || {}, context.vars);
  await promptForConfig(context);

  debug(`Context is ${ JSON.stringify(context) }`);
}

module.exports = { buildContext };