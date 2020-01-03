'use strict';
const fs = require('fs-extra');
const path = require('path');

const { red } = require('colors');
const { readJsonFromFile } = require('../utils/file');
const { getRootTplPath, detectTplPath, validateYmlName, DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX} = require('../tpl');

const _ = require('lodash');

async function getModifiedTimes(tplPath) {
  if (tplPath.indexOf(DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX) === -1) { return {}; }

  const rootTplPath = getRootTplPath(tplPath);
  const metaPath = path.resolve(path.dirname(rootTplPath), DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX, 'meta.json');

  if (!await fs.pathExists(metaPath)) { return {}; }

  const metaObj = await readJsonFromFile(metaPath);

  if (_.isEmpty(metaObj)) {
    return {};
  }

  return _.pickBy((metaObj.modifiedTimes || {}), (mtime, filePath) => {
    const lstat = fs.lstatSync(filePath);
    return mtime !== lstat.mtime.getTime().toString();
  });
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

  const modifiedTimes = await getModifiedTimes(tplPath); // for fun build scene

  if (!_.isEmpty(modifiedTimes)) {
    throw new Error(`
        ${Object.keys(modifiedTimes).join('\n\t')}\n` +
`
Fun detected the above path have been modified. Please execute ‘fun build’ to compile your functions.`);
  }

  await require('../deploy/deploy-by-tpl').deploy(tplPath, context);
}

module.exports = deploy;
