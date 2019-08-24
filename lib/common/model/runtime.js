'use strict';

const functionSchema = require('../../validate/schema/function');

const supportedRuntimes = functionSchema.properties.
  Properties.properties.
  Runtime.enum;

function isSupportedRuntime(runtime) {
  return supportedRuntimes.includes(runtime);
}

function getSupportedRuntimes(ignoredRuntimes) {
  return supportedRuntimes.filter((r) => !(ignoredRuntimes || []).includes(r));
}

function getSupportedRuntimesAsString(ignoredRuntimes) {
  return getSupportedRuntimes(ignoredRuntimes).join(', ');
}

module.exports = {
  isSupportedRuntime,
  getSupportedRuntimes,
  getSupportedRuntimesAsString
};