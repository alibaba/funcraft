'use strict';
const commandExists = require('command-exists');
const fs = require('fs-extra');
const path = require('path');
const { spawnSync } = require('child_process');
const debug = require('debug')('fun:vcs');
const uuid = require('uuid');
const httpx = require('httpx');
const { createProgressBar } = require('../import/utils');
const { green, yellow } = require('colors');
const unzipper = require('unzipper');

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
    } else if (repoUrl.indexOf('bitbucket') !== -1) {
      return { repoType: 'hg', repoUrl: repoUrl };
    }
  }

  throw new Error('Unknown Repo Type.');
}

function isVCSInstalled(repoType) {
  return commandExists.sync(repoType);
}

function cloneArguments(repoType, repoUrl, outputDir) {
  switch (repoType) {
  case 'git':
    return ['clone', '--depth=1', repoUrl, outputDir];
  default:
    return ['clone', repoUrl, outputDir];
  }
}

function getRepoZipUrl(repoUrl) {
  if (repoUrl.includes('github')) {
    const parts = repoUrl.split('/');
    const repo = parts.pop().replace('.git', '');
    const group = parts.pop();
    return `https://codeload.github.com/${group}/${repo}/zip/master`;
  }
  throw new Error('Only support repo zip file from github.');
}

function cloneRepo(repoType, repoUrl, outputDir, repoDir, checkout) {
  console.log('start cloning...');
  spawnSync(repoType, cloneArguments(repoType, repoUrl, outputDir), { cmd: repoDir, stdio: 'inherit' });
  console.log('finish clone.');

  if (checkout) {
    debug('checkout is %s', checkout);
    spawnSync(repoType, ['checkout', checkout], { cmd: repoDir, stdio: 'inherit' });
  }
}

async function downloadRepoZip(repoType, repoUrl, repoDir, outputDir, checkout) {
  if (checkout) {
    console.warn(`Need to install ${repoType} to support checkout.`);
  }
  debug('start downloading...');
  // https://github.com/JacksonTian/httpx/blob/master/lib/index.js#L36-L44
  const response = await httpx.request(getRepoZipUrl(repoUrl), { timeout: 36000000, method: 'GET' }); // 10 hours
  const len = parseInt(response.headers['content-length'], 10);
  let bar;
  if (len) {
    bar = createProgressBar(`${green(':loading')} downloading :bar :rate/bps :percent :etas`, { total: len });
  }
  response.on('data', (chunk) => {
    if (bar) {
      bar.tick(chunk.length);
    }
  });
  response.on('end', () => {
    debug('finish download.');
  });
  
  return new Promise((resolve, reject) => response.pipe(unzipper.Extract({ path: outputDir })).on('error', err => {
    if (bar) {
      bar.interrupt(err);
    }
    reject(err);
  }).on('finish', () => {
    const sourcePath = path.join(repoDir, repoUrl.split('/').pop().replace('.git', '') + '-master');
    const cachePath = path.join(repoDir, '..', `.fun-init-cache-${uuid.v1()}`);
    fs.moveSync(sourcePath, cachePath);
    fs.moveSync(cachePath, repoDir, { overwrite: true });
    resolve();
  }));

}

async function clone(repoUrl, cloneToDir = '.', checkout) {
  debug('clone to dir: %s', cloneToDir);
  cloneToDir = path.resolve(cloneToDir);
  await fs.ensureDir(cloneToDir);

  const repo = identifyRepo(repoUrl);
  const repoType = repo.repoType;
  repoUrl = repo.repoUrl;

  debug('repo type is: %s', repoType);
  debug('repo url is: %s', repoUrl);  

  const outputDir = '.fun-init-cache-' + uuid.v1();
  let repoDir = path.join(cloneToDir, outputDir);

  repoUrl = repoUrl.replace(/\/+$/g, '');

  debug('repoDir is %s', repoDir);
  if (isVCSInstalled(repoType)) {
    cloneRepo(repoType, repoUrl, outputDir, repoDir, checkout);
  } else {
    if (repoType === 'git') {
      console.warn(yellow('git command is not installled, try to download template by HTTP.'));
      await downloadRepoZip(repo, repoUrl, repoDir, outputDir, checkout);
    } else {
      throw new Error(`${repoType} is not installed.`);
    }
  }

  return repoDir;
}

module.exports = { clone };