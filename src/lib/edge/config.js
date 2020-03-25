/* eslint-disable indent */

'use strict';

const DEFAULT_TIMEOUT_SECONDS = 3;
const DEFAULT_MEMORY = 128;

/**
 * Data class to store function configuration.
 */
class FunctionConfig {
  constructor({
    identifier,
    accountId,
    region,
    runtime,
    handler,
    timeout = DEFAULT_TIMEOUT_SECONDS,
    memory = DEFAULT_MEMORY,
    codeAbsPath,
    envVars
  }) {
    this.identifier = identifier;
    this.accountId = accountId;
    this.region = region;
    this.runtime = runtime;
    this.handler = handler;
    this.timeout = timeout;
    this.memory = memory;
    this.codeAbsPath = codeAbsPath;
    this.envVars = envVars;
  }
}

module.exports = FunctionConfig;
