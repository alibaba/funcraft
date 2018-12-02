'use strict';

const parser = require('git-ignore-parser');
const ignore = require('ignore');
const fs = require('fs');
const path = require('path');
const template = require('lodash/template');
const templateSettings = require('lodash/templateSettings');
const debug = require('debug')('fun:renderer');
const { green } = require('colors');
templateSettings.interpolate = /{{([\s\S]+?)}}/g;

function renderContent(content, context) {
  return template(content)(context.vars);
}

function isCopyOnlyPath(file, context) {
  const copyOnlyPaths = context.config.copyOnlyPaths;
  if (copyOnlyPaths) {
    debug(`copyOnlyPath is ${ copyOnlyPaths }`);
    const ignoredPaths = parser(copyOnlyPaths);
    const ig = ignore().add(ignoredPaths);
    const relativePath = path.relative(path.resolve(context.repoDir, context.templateDir), file);
    debug(`relativePath is ${ relativePath }`);
    return ig.ignores(relativePath);
  }
  return false;
}

function renderFile(file, context) {
  const renderedFile = renderContent(file, context);
  const fullSourceFile = path.resolve(context.repoDir, file);
  const fullTargetFile= path.resolve(context.outputDir, renderedFile);
  debug('Source file: %s, target file: %s', fullSourceFile, fullTargetFile);
  console.log(green(`+ ${ fullTargetFile }`));

  if (isCopyOnlyPath(fullSourceFile, context)) {
    debug('Copy %s to %s', fullSourceFile, fullTargetFile);
    fs.createReadStream(fullSourceFile).pipe(fs.createWriteStream(fullTargetFile));
    return;
  }

  const content = fs.readFileSync(fullSourceFile, 'utf8');
  const renderedContent = renderContent(content, context);

  fs.writeFileSync(fullTargetFile, renderedContent);
}

function renderDir(dir, context) {
  const renderedDir = renderContent(dir, context);
  const fullSourceDir = path.resolve(context.repoDir, dir);
  const fullTargetDir = path.resolve(context.outputDir, renderedDir);

  debug('Source Dir: %s, target dir: %s', fullSourceDir, fullTargetDir);
  console.log(green(`+ ${ fullTargetDir }`));
  fs.mkdirSync(fullTargetDir);
  const files = fs.readdirSync(fullSourceDir);
  files.forEach(file => {
    const targetFile = path.join(dir, file);
    const fullTargetFile = path.resolve(fullSourceDir, file);
    var stat = fs.statSync(fullTargetFile);
    if (stat && stat.isDirectory()) {
      renderDir(targetFile, context);
    } else {
      renderFile(targetFile, context);
    }
  });
}

function render(context) {
  console.log('Start rendering template...');
  renderDir(context.templateDir, context);
  console.log('finish rendering template.');
}

module.exports = { render, renderContent };