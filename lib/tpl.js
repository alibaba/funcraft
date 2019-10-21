'use strict';

const fs = require('fs-extra');
const path = require('path');

const yaml = require('js-yaml');
const debug = require('debug')('fun:tpl');
const { red, yellow } = require('colors');

const DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX = path.join('.fun', 'build', 'artifacts');
const DEFAULT_NAS_PATH_SUFFIX = path.join('.fun', 'nas');
const DEFAULT_TMP_INVOKE_PATH_SUFFIX = path.join('.fun', 'tmp', 'invoke');

let firstDetect = true;

async function asyncFind(pathArrays, filter) {
  for (let path of pathArrays) {
    if (await filter(path)) {
      return path;
    }
  }

  return null;
}

async function detectTplPath(preferBuildTpl = true, customTemplateLocations = []) {

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

  if (tplPath && firstDetect) {
    console.log(yellow(`using template: ${path.relative(process.cwd(), tplPath)}`));
    firstDetect = false;
  }

  return tplPath;
}

async function getTpl(tplPath) {

  const tplContent = await fs.readFile(tplPath, 'utf8');
  const tpl = yaml.safeLoad(tplContent);

  debug('exist tpl: %j', tpl);

  return tpl;
}

function validateYmlName(tplPath) {
  if (!(path.basename(tplPath).endsWith('.yml') || path.basename(tplPath).endsWith('.yaml'))) {
    throw new Error(red(`The template file name must end with yml or yaml.`));
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

function detectTmpDir(tplPath, tmpDir) {
  if (tmpDir) { return tmpDir; }

  const baseDir = getBaseDir(tplPath);
  return path.join(baseDir, DEFAULT_TMP_INVOKE_PATH_SUFFIX);
}

function detectNasBaseDir(tplPath) {
  const baseDir = getBaseDir(tplPath);

  return path.join(baseDir, DEFAULT_NAS_PATH_SUFFIX);
}

module.exports = {
  getTpl, detectTplPath, validateYmlName, 
  detectNasBaseDir, DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX, DEFAULT_NAS_PATH_SUFFIX,
  detectTmpDir, DEFAULT_TMP_INVOKE_PATH_SUFFIX, getBaseDir
};