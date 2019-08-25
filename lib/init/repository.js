'use strict';

const { clone } = require('./vcs');
const { renderContent } = require('./renderer');
const debug = require('debug')('fun:repository');
const fs = require('fs');
const path = require('path');

const BUILTIN_ABBREVIATIONS = {
  'gh': 'https://github.com/{{ template }}.git',
  'gl': 'https://gitlab.com/{{ template }}.git',
  'bb': 'https://bitbucket.org/{{ template }}',
  'github': 'https://github.com/{{ template }}.git',
  'gitlab': 'https://gitlab.com/{{ template }}.git',
  'bitbucket': 'https://bitbucket.org/{{ template }}'
};

// something like git:// ssh:// etc. or something like user@...
const REPO_REGEX = /((((git|hg)\+)?(git|ssh|https?):(\/\/)?)|(\w+@[\w.]+))/;

function getOfficialTemplates() {
  debug('get official template list...');
  const content = fs.readFileSync(path.join(__dirname, 'templates.json'), 'utf8');
  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Unable to parse JSON file from ./templates.json. Error: ${err}`);
  }
}

function isRepoUrl(value) {
  return REPO_REGEX.test(value);
}

function expandAbbreviations(template, abbreviations) {
  debug('abbreviations is %s', JSON.stringify(abbreviations));

  if (template in abbreviations) {
    return renderContent(abbreviations[template], {
      vars: { templatePath: path.resolve(__dirname, '../../templates') }
    });
  }

  let arr = template.split(':');
  if (arr.length === 2) {
    const [prefix, rest] = arr;
    if (prefix in abbreviations) {
      return renderContent(abbreviations[prefix], { vars: { template: rest } });
    }
  }
  /*
   * username/repo-name, username can only contain alphanumeric characters and hyphen, and cannot begin and end with hyphen;
   * repo-name cannot be "." and ".." and can only contain dot, alphanumeric characters, underline and hyphen
   */
  if (/^([\w\d]+(-+[\d\w])|[\w\d]+)\/((\.[\w\d-_]+)|(\.\.[\w\d-_.]+)|[\w\d-_][\w\d-_.]*)$/.test(template)) {
    arr = template.split('/');
    return renderContent(abbreviations['gh'], { vars: { template } });
  }
  
  return template;
}

/**
 * 
 * @param {A directory containing a project template directory, or a URL to a git repository.} template 
 * @param {The directory to clone the repository into.} cloneToDir 
 * @param {The branch, tag or commit ID to checkout after clone.} checkout 
 */
async function determineRepoDir(context, cloneToDir = '.', checkout) {
  debug('determine repo dir...');
  let clean = false;
  const template = expandAbbreviations(context.location, Object.assign(BUILTIN_ABBREVIATIONS, context.templates));
  let repoDir = template;
  if (isRepoUrl(template)) {
    clean = true;
    repoDir = await clone(template, cloneToDir, checkout);
  }
  return { repoDir, clean };
}

module.exports = { determineRepoDir, getOfficialTemplates };