'use strict';

const functionSchema = require('../../validate/schema/function');

const propertiesOneOf = functionSchema.properties.Properties.oneOf;

let supportedRuntimes = [];
for (const properties of propertiesOneOf) {
  supportedRuntimes = supportedRuntimes.concat(properties.properties.Runtime.enum);
}

function isSupportedRuntime(runtime) {
  return supportedRuntimes.includes(runtime);
}

function getSupportedRuntimes(ignoredRuntimes) {
  return supportedRuntimes.filter((r) => !(ignoredRuntimes || []).includes(r));
}

function getSupportedRuntimesAsString(ignoredRuntimes) {
  return getSupportedRuntimes(ignoredRuntimes).join(', ');
}

function isCustomContainerRuntime(runtime) {
  return runtime === 'custom-container';
}

module.exports = {
  isSupportedRuntime,
  getSupportedRuntimes,
  getSupportedRuntimesAsString,
  isCustomContainerRuntime
};