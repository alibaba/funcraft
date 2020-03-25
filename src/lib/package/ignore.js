'use strict';

const parser = require('git-ignore-parser'),
  ignore = require('ignore'),
  fs = require('fs-extra'),
  path = require('path');

const { generateIgnoreFileFromNasYml } = require('../nas/support');

const ignoredFile = ['.git', '.svn', '.env', '.DS_Store', 'template.packaged.yml', '.nas.yml', '.fun/nas', '.fun/tmp', '.fun/package'];

function selectIgnored(runtime) {
  switch (runtime) {
  case 'nodejs6':
  case 'nodejs8':
  case 'nodejs10':

    return ['.fun/python'];
  case 'python2.7':
  case 'python3':

    return ['node_modules'];
  case 'php7.2':

    return ['node_modules', '.fun/python'];
  default:
    return [];
  }
}

module.exports = async function (baseDir, runtime) {

  const ignoreFilePath = `${baseDir}/.funignore`;

  var fileContent = '';

  if (fs.existsSync(ignoreFilePath)) {
    fileContent = fs.readFileSync(ignoreFilePath, 'utf8');
  }

  const ignoreDependencies = selectIgnored(runtime);

  const ignoreList = await generateIgnoreFileFromNasYml(baseDir);

  const ignoredPaths = parser(`${[...ignoredFile, ...ignoreList, ...ignoreDependencies].join('\n')}\n${fileContent}`);

  const ig = ignore().add(ignoredPaths);
  return function (f) {
    const relativePath = path.relative(baseDir, f);

    if (relativePath === '') { return false; }
    return ig.ignores(relativePath);
  };
};