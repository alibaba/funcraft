/* eslint-disable indent */

'use strict';

class Function {
  constructor({
    identifier,
    handler,
    runtime,
    timeout,
    codeUri,
    memorySize,
    envVars,
    initializer = undefined,
    initializationTimeout = undefined
  }) {
    this.identifier = identifier;
    this.handler = handler;
    this.runtime = runtime;
    this.timeout = timeout;
    this.codeUri = codeUri;
    this.memorySize = memorySize;
    this.envVars = envVars;
    this.initializer = initializer;
    this.initializationTimeout = initializationTimeout;
  }
}

module.exports = Function;
