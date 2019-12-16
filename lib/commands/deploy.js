'use strict';
const fs = require('fs-extra');
const path = require('path');

const { red } = require('colors');
const { readJsonFromFile } = require('../utils/file');
const { findFunctionsInTpl } = require('../definition');
const { getTpl, getRootTplPath, detectTplPath, validateYmlName, DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX} = require('../tpl');

const _ = require('lodash');

function extractCodeUris(tpl) {
  const functions = findFunctionsInTpl(tpl);
  return functions.map(func => {
    const { functionRes } = func;
    return path.resolve(functionRes.Properties.CodeUri);
  });
}

async function isMetaContentUpdate(tplPath) {
  if (tplPath.indexOf(DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX) === -1) { return false; }

  const rootTplPath = getRootTplPath(tplPath);
  const rootTpl = await getTpl(rootTplPath);
  const codeUris = extractCodeUris(rootTpl);

  const metaPath = path.resolve(path.dirname(rootTplPath), DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX, 'meta.json');

  if (!await fs.pathExists(metaPath)) { return false; }

  const metaObj = await readJsonFromFile(metaPath);

  if (_.isEmpty(metaObj)) {
    return false;
  }

  for (const path of [...codeUris, ...[rootTplPath]]) {

    const files = metaObj.modifiedTime || {};

    if (!files[path]) {
      return true;
    }
    const lstat = await fs.lstat(path);

    if (files[path] !== lstat.mtime.getTime().toString()) {
      return true;
    }
  }

  return false;
}

async function deploy(context) {

  let tplPath = context.template;

  if (!tplPath) {
    tplPath = await detectTplPath(true, ['template.packaged.yml']);
  }

  if (!tplPath) {
    throw new Error(red('Current folder not a fun project\nThe folder must contains template.[yml|yaml] or faas.[yml|yaml] .'));
  }

  validateYmlName(tplPath);

  if (await isMetaContentUpdate(tplPath)) { // for fun build scene

    console.warn(red(`Fun will you use ${path.relative(process.cwd(), tplPath)} to deploy the resource service and detect changes in the file. Please execute fun build to make sure the deployment is correct before that. If you have already done so, please ignore.`));
  }

  await require('../deploy/deploy-by-tpl').deploy(tplPath, context);
}

module.exports = deploy;
