'use strict';

const functionSchema = require('../../validate/schema/function');

const supportedRuntimeArray = functionSchema.properties.
  Properties.properties.
  Runtime.enum.filter((r) => r!=='custom');

function isValidRuntime(runtime) {
  return supportedRuntimes().includes(runtime);
}

function supportedRuntimes(ignoredRuntimes) {
  return supportedRuntimeArray.filter((r) => !(ignoredRuntimes || []).includes(r));
}

function supportedRuntimesAsString(ignoredRuntimes) {
  return supportedRuntimes(ignoredRuntimes).join(', ');
}

module.exports = {
  isValidRuntime,
  supportedRuntimes,
  supportedRuntimesAsString
};