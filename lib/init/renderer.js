'use strict';

const parser = require('git-ignore-parser');
const ignore = require('ignore');
const fs = require('fs');
const path = require('path');
const template = require('lodash/template');
const templateSettings = require('lodash/templateSettings');
const yaml = require('js-yaml');
const { isObject } = require('lodash/lang');
const debug = require('debug')('fun:renderer');
const { green } = require('colors');
templateSettings.interpolate = /{{([\s\S]+?)}}/g;

function renderContent(content, context) {
  return template(content)(context.vars);
}

function isMatch(file, paths, context) {
  if (paths) {
    debug(`Path is ${ paths }`);
    const ignoredPaths = parser(paths);
    const ig = ignore().add(ignoredPaths);
    const relativePath = path.relative(path.resolve(context.repoDir, context.templateDir), file);
    if (!relativePath) {
      return false;
    }
    debug(`relativePath is ${ relativePath }`);
    return ig.ignores(relativePath);
  }
  return false;
}

function isCopyOnlyPath(file, context) {
  const copyOnlyPaths = context.config.copyOnlyPaths;
  return isMatch(file, copyOnlyPaths, context);
}

function isIgnorePaths(file, context) {
  const ignorePaths = context.config.ignorePaths;
  return isMatch(file, ignorePaths, context);
}

function needMerge(file, context) {
  return context.merge
    && /template.(yml|yaml)$/.test(file)
    && fs.existsSync(path.resolve(context.outputDir, file));
}

function doMerge(source, target) {
  const merged = {};
  for (let p in source) {
    if (isObject(source[p]) && isObject(target[p])) {
      merged[p] = doMerge(source[p], target[p]);
    } else {
      merged[p] = source[p];
    }
  }

  return Object.assign(target, merged);
}

function merge(fullSourceFile, fullTargetFile, context) {
  debug(`merge: %s and %s`, fullSourceFile, fullTargetFile);
  const sourceContent = fs.readFileSync(fullSourceFile, 'utf8');
  const targetContent = fs.readFileSync(fullTargetFile, 'utf8');
  const stat = fs.statSync(fullSourceFile);
  const renderedSourceContent = renderContent(sourceContent, context);
  const source = yaml.safeLoad(renderedSourceContent);
  const target = yaml.safeLoad(targetContent);
  const merged = doMerge(source, target);
  fs.writeFileSync(fullTargetFile, yaml.safeDump(merged));
  fs.chmodSync(fullTargetFile, stat.mode);
}

function renderFile(file, context) {
  const renderedFile = renderContent(file, context);
  const fullSourceFile = path.resolve(context.repoDir, file);
  const fullTargetFile = path.resolve(context.outputDir, renderedFile);
  debug('Source file: %s, target file: %s', fullSourceFile, fullTargetFile);

  if (isIgnorePaths(fullSourceFile, context)) {
    return;
  }

  console.log(green(`+ ${ fullTargetFile }`));

  const stat = fs.statSync(fullSourceFile);

  if (isCopyOnlyPath(fullSourceFile, context)) {
    debug('Copy %s to %s', fullSourceFile, fullTargetFile);
    fs.createReadStream(fullSourceFile).pipe(fs.createWriteStream(fullTargetFile));
    fs.chmodSync(fullTargetFile, stat.mode);
    return;
  }

  if (needMerge(renderedFile, context)) {
    merge(fullSourceFile, fullTargetFile, context);
    return;
  }

  const content = fs.readFileSync(fullSourceFile, 'utf8');
  const renderedContent = renderContent(content, context);
  fs.writeFileSync(fullTargetFile, renderedContent);
  fs.chmodSync(fullTargetFile, stat.mode);
}

function renderDir(dir, context) {
  const renderedDir = renderContent(dir, context);
  const fullSourceDir = path.resolve(context.repoDir, dir);
  const fullTargetDir = path.resolve(context.outputDir, renderedDir);

  if (isIgnorePaths(fullSourceDir, context)) {
    return;
  }

  const stat = fs.statSync(fullSourceDir);

  debug('Source Dir: %s, target dir: %s', fullSourceDir, fullTargetDir);
  console.log(green(`+ ${ fullTargetDir }`));
  if (!fs.existsSync(fullTargetDir)) {
    fs.mkdirSync(fullTargetDir);
    fs.chmodSync(fullTargetDir, stat.mode);

  }
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