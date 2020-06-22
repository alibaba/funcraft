'use strict';

const parser = require('git-ignore-parser'),
  ignore = require('ignore'),
  fs = require('fs-extra'),
  path = require('path'),
  _ = require('lodash');

const { generateIgnoreFileFromNasYml } = require('../nas/support');

const ignoredFile = ['.git', '.svn', '.env', '.DS_Store', 'template.packaged.yml', '.nas.yml', '.fun/nas', '.fun/tmp', '.fun/package'];

function selectIgnored(runtime) {
  switch (runtime) {
  case 'nodejs6':
  case 'nodejs8':
  case 'nodejs10':
  case 'nodejs12':

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

async function getIgnoreContent(ignoreFilePath) {
  let fileContent = '';

  if (fs.existsSync(ignoreFilePath)) {
    fileContent = await fs.readFile(ignoreFilePath, 'utf8');
  }
  return fileContent;
}

async function isIgnored(baseDir, runtime) {

  const ignoreFilePath = `${baseDir}/.funignore`;

  const fileContent = await getIgnoreContent(ignoreFilePath);

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

async function updateIgnore(baseDir, patterns) {
  const ignoreFilePath = `${baseDir}/.funignore`;

  const fileContent = await getIgnoreContent(ignoreFilePath);

  let lines = fileContent.split(/\r?\n/);

  for (let i = 0; i < patterns.length;i++) {
    if (!_.includes(lines, patterns[i])) {
      lines.push(patterns[i]);
    }
  }

  await fs.writeFile(ignoreFilePath, lines.join('\n'));

}

module.exports = {
  isIgnored,
  updateIgnore
};
