'use strict';

const parser = require('git-ignore-parser'),
  ignore = require('ignore'),
  fs = require('fs'),
  path = require('path');

const { generateIgnoreFileFromNasYml } = require('../nas/support');

const ignoredFile = ['.git', '.svn', '.env', '.fun/nas', '.fun/tmp', '.DS_Store', 'template.packaged.yml', '.nas.yml'];

module.exports = async function (baseDir) {

  const ignoreFilePath = `${baseDir}/.funignore`;

  var fileContent = '';

  if (fs.existsSync(ignoreFilePath)) {
    fileContent = fs.readFileSync(ignoreFilePath, 'utf8');
  }

  const ignoreList = await generateIgnoreFileFromNasYml(baseDir);

  const ignoredPaths = parser(`${[...ignoredFile, ...ignoreList].join('\n')}\n${fileContent}`);

  const ig = ignore().add(ignoredPaths);
  return function (f) {
    const relativePath = path.relative(baseDir, f);

    if (relativePath === '') { return false; }
    return ig.ignores(relativePath);
  };
};