'use strict';
const { promptForExistingPath } = require('./prompt');
const commandExists = require('command-exists');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const debug = require('debug')('fun:vcs');

function identifyRepo(repoUrl) {
  debug('identify repo...');
  const repoUrlValues = repoUrl.split('+');

  if (repoUrlValues.length === 2) {
    const [repoType, realRepoUrl] = repoUrlValues;
    if (['git', 'hg'].includes(repoType)) {
      return { repoType, repoUrl: realRepoUrl };
    }
  } else {
    if (repoUrl.indexOf('git') !== -1) {
      return { repoType: 'git', repoUrl: repoUrl };
    } else if (repoUrl.indexOf('bitbucket')) {
      return { repoType: 'hg', repoUrl: repoUrl };
    }
  }

  throw new Error('Unknown Repo Type.');
}

function isVCSInstalled(repoType) {
  return commandExists.sync(repoType);
}

function makeSurePathExists(p) {
  if (fs.existsSync(p)) {
    return true;
  } 
  if (makeSurePathExists(path.dirname(p))) {
    fs.mkdirSync(p);
    return true;
  }
  
}

async function clone(repoUrl, cloneToDir = '.', checkout) {
  debug('clone to dir: %s', cloneToDir);
  cloneToDir = path.resolve(cloneToDir);
  makeSurePathExists(cloneToDir);

  const repo = identifyRepo(repoUrl);
  const repoType = repo.repoType;
  repoUrl = repo.repoUrl;

  if (!isVCSInstalled(repoType)) {
    throw new Error(`${repoType} is not installed.`);
  }

  debug('repo type is: %s', repoType);
  debug('repo url is: %s', repoUrl);

  repoUrl = repoUrl.replace(/'^\/+|\/+$/g, '');
  let tail = repoUrl.split('/').pop();
  let repoDir = '';
  if (repoType === 'git') {
    tail = tail.split('.git')[0];
  }
  repoDir = path.join(cloneToDir, tail);
  debug('repoDir is %s', repoDir);
  await promptForExistingPath(repoDir, `You've downloaded ${repoDir} before. Is it okay to delete and re-download it?`);
  console.log('start cloning...');
  spawnSync(repoType, ['clone', repoUrl], { cmd: repoDir, stdio: 'inherit' });
  console.log('finish cloning.');

  if (checkout) {
    debug('checkout is %s', checkout);
    spawnSync(repoType, ['checkout', checkout], { cmd: repoDir, stdio: 'inherit' });
  }

  return repoDir;
}

module.exports = { clone, makeSurePathExists };