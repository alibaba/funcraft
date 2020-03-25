'use strict';

const YAML = require('js-yaml');
const _ = require('lodash');
const { schema } = require('./schema');

const loadYaml = (contents, options) => {
  let data, error;
  try {
    data = YAML.load(contents.toString(), options || {});
  } catch (ex) {
    error = ex;
  }
  return {
    data,
    error
  };
};

const parseYamlWithCustomTag = (filePath, contents) => {
  const options = {
    filename: filePath
  };
  let result = loadYaml(contents, options);
  if (result.error && result.error.name === 'YAMLException') {
    _.merge(options, { schema });
    result = loadYaml(contents, options);
  }
  if (result.error) {
    throw result.error;
  } else {
    return result.data;
  }
};

module.exports = {
  parseYamlWithCustomTag
};