'use strict';

const parser = require('git-ignore-parser'),
  ignore = require('ignore'),
  fs = require('fs'),
  path = require('path');

const ignoredFile = ['.git', '.svn', '.env'];

module.exports = function (baseDir) {
  const content = fs.readFileSync(`${baseDir}/.funignore`, 'utf8') + `\n${ignoredFile.join('\n')}`;
  const ignoredPaths = parser(content);
  const ig = ignore().add(ignoredPaths);
  return function (f) {
    const relativePath = path.relative(baseDir, f);

    if(relativePath === '') {return false;}
    return ig.ignores(relativePath);
  };
};