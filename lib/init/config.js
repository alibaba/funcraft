
'use strict';

const fs = require('fs');
const { isArray } = require('lodash/lang');
const path = require('path');
const { renderContent } = require('./renderer');
const requireFromString = require('require-from-string');
const debug = require('debug')('fun:config');

function getConfig(context) {
  let configPath = path.resolve(context.repoDir, 'metadata.json');
  let isJSON = true;

  if (!fs.existsSync(configPath)) {
    configPath = path.resolve(context.repoDir, 'metadata.js');
    if (!fs.existsSync(configPath)) {
      return {};
    }
    isJSON = false; 
  }

  debug('configPath is %s', configPath);
  const renderedContent = renderContent(fs.readFileSync(configPath, 'utf8'), context);
  let config;
  if (isJSON) {
    try {
      config = JSON.parse(renderedContent);
    } catch (err) {
      throw new Error(`Unable to parse JSON file ${configPath}. Error: ${err}`);
    }
  } else {
    config = requireFromString(renderedContent);
  }
  if (isArray(config.copyOnlyPaths)) {
    config.copyOnlyPaths = config.copyOnlyPaths.join('\n');
  }
  return config;
}

module.exports = { getConfig };