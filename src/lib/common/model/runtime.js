'use strict';

const functionSchema = require('../../validate/schema/function');

const propertiesOneOf = functionSchema.properties.Properties.oneOf;
const supportedRuntime0 = propertiesOneOf[0].properties.Runtime.enum;
const supportedRuntime1 = propertiesOneOf[1].properties.Runtime.enum;
const supportedRuntimes = supportedRuntime0.concat(supportedRuntime1);

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