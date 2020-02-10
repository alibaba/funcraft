'use strict';

const fs = require('fs-extra');
const path = require('path');
const debug = require('debug')('fun:tpl');
const { red, yellow } = require('colors');

const DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX = path.join('.fun', 'build', 'artifacts');
const DEFAULT_NAS_PATH_SUFFIX = path.join('.fun', 'nas');
const DEFAULT_LOCAL_TMP_PATH_SUFFIX = path.join('.fun', 'tmp', 'local');
const validate = require('../lib/validate/validate');
const { mergeTpl } = require('./utils/tpl');

let hasShownTip = false;

async function asyncFind(pathArrays, filter) {
  for (let path of pathArrays) {
    if (await filter(path)) {
      return path;
    }
  }

  return null;
}

async function detectTplPath(preferBuildTpl = true, customTemplateLocations = [], showTip = true) {

  let buildTemplate = [];

  if (preferBuildTpl) {
    buildTemplate = ['template.yml', 'template.yaml'].map(f => {
      return path.join(process.cwd(), '.fun', 'build', 'artifacts', f);
    });
  }

  const defaultTemplate = ['template.yml', 'template.yaml', 'faas.yml', 'faas.yaml']
    .map((f) => path.join(process.cwd(), f));

  const tplPath = await asyncFind([...customTemplateLocations, ...buildTemplate, ...defaultTemplate], async (path) => {
    return await fs.pathExists(path);
  });

  if (tplPath && showTip && !hasShownTip) {
    console.log(yellow(`using template: ${path.relative(process.cwd(), tplPath)}`));
    hasShownTip = false;
  }

  return tplPath;
}

async function generateMergedTpl(templates = [], preferBuildTpl = true, customTemplateLocations = [], showTip = true) {
  let tplPath;
  if (templates.length > 0) {
    tplPath = templates[0];
  }

  if (!tplPath) {
    tplPath = await detectTplPath(preferBuildTpl, customTemplateLocations, showTip);
    let overrideTplPath;
    if (tplPath) {
      templates.push(tplPath); 
      overrideTplPath = await detectOverrideTplPath(tplPath);
    }
    if (overrideTplPath) {
      templates.push(overrideTplPath);
    }
  }

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  validateTplName(...templates);

  await validate(...templates);

  const tpl = await getTpl(...templates);
  return {
    tpl,
    tplPath
  };
}

async function detectOverrideTplPath(tplPath) {
  if (!tplPath) {
    return;
  }
  const overrideTplPath = path.resolve(path.dirname(tplPath), 'template.override.yml');
  if (await fs.pathExists(overrideTplPath)) {
    return overrideTplPath;
  }
  return;
}

async function getTpl(...tplPaths) {

  const tpl = mergeTpl(...tplPaths);

  debug('exist tpl: %j', tpl);

  return tpl;
}

function validateTplName(...tplPaths) {
  for (const tplPath of tplPaths) {
    if (!(path.basename(tplPath).endsWith('.yml') || path.basename(tplPath).endsWith('.yaml'))) {
      throw new Error(red(`The template file name must end with yml or yaml.`));
    }
  }
}

function getBaseDir(tplPath) {
  const idx = tplPath.indexOf(DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX);

  if (idx !== -1) {
    const baseDir = tplPath.substring(0, idx);
    if (!baseDir) {
      return process.cwd();
    }
    return baseDir;
  }
  return path.resolve(path.dirname(tplPath));
}

function getRootBaseDir(baseDir) {
  const idx = baseDir.indexOf(DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX);
  if (idx !== -1) { // exist
    return baseDir.substring(0, idx);
  }
  return baseDir;
}

function getRootTplPath(tplPath) {
  const baseDir = getBaseDir(tplPath);
  return path.join(baseDir, path.basename(tplPath));
}

function getNasYmlPath(tplPath) {
  const baseDir = getBaseDir(tplPath);
  return path.join(baseDir, '.nas.yml');
}

function detectTmpDir(tplPath, tmpDir) {
  if (tmpDir) { return tmpDir; }

  const baseDir = getBaseDir(tplPath);
  return path.join(baseDir, DEFAULT_LOCAL_TMP_PATH_SUFFIX);
}

function detectNasBaseDir(tplPath) {
  const baseDir = getBaseDir(tplPath);

  return path.join(baseDir, DEFAULT_NAS_PATH_SUFFIX);
}

module.exports = {
  getTpl, detectTplPath, validateTplName,
  detectNasBaseDir, DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX, DEFAULT_NAS_PATH_SUFFIX,
  detectTmpDir, DEFAULT_LOCAL_TMP_PATH_SUFFIX, getBaseDir, getNasYmlPath, getRootBaseDir,
  getRootTplPath, detectOverrideTplPath, generateMergedTpl
};