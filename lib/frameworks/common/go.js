'use strict';

const debug = require('debug')('fun:deploy');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');

async function findBinNameByGoMod(codeDir) {
  const modFile = path.join(codeDir, 'go.mod');
  if (!await fs.pathExists(modFile)) { return null; }
  
  const contents = await fs.readFile(modFile, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const idx = line.indexOf('module ');
    if (idx >= 0) {
      let moduleName = _.trim(line.substring(idx + 'module '.length));
      const guessBinName = path.basename(moduleName);
      const guessPaths = ['.', 'bin'];
      for (const guessPath of guessPaths) {
        const guessBinAbsPath = path.join(codeDir, guessPath, guessBinName);
        debug(`checking file ${guessBinAbsPath} exists...`);
        if (await fs.pathExists(guessBinAbsPath)) {
          return path.posix.join(guessPath, guessBinName);
        }
      }
    }
  }

  return null;
}

async function findBinNameByBinFolder(codeDir) {
  debug(`check bin/ folder exist...`);

  const binDir = path.join(codeDir, 'bin');

  if (!await fs.pathExists(binDir)) { return null; }

  const files = await fs.readdir(binDir);
  if (files.length === 1) {
    if (files[0] !== 'bootstrap') {
      return path.posix.join('bin', files[0]);
    }
  } else if (files.length === 2 && files.includes(files, 'bootstrap')) {
    for (const file of files) {
      if (file !== 'bootstrap') {
        return path.posix.join('bin', file);
      }
    }
  }

  debug('files of bin folder', files);

  return null;
}

async function findBinNameByProjectFolder(codeDir) {
  const name = path.basename(codeDir);
  const binName = path.join(codeDir, name);
  if (await fs.pathExists(binName)) { return name; }
  return null;
}

async function findBinName(codeDir) {
  let binName = await findBinNameByGoMod(codeDir);

  if (!binName) {
    binName = await findBinNameByProjectFolder(codeDir);
  }
  
  if (!binName) {
    binName = await findBinNameByBinFolder(codeDir);
  }

  return binName;
}

module.exports = {
  findBinName
};