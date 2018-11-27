/* eslint-disable indent */

'use strict';

const path = require('path');
const debug = require('debug')('edge:runner');

const { findFunctionInTpl } = require('../definition');
const Function = require('../function');
const FunctionConfig = require('./config');

const MAX_DEBUG_TIMEOUT = 36000;
const CURRENT_DIR = '.';

class LocalRunner {
  constructor({
    cwd,
    runtime,
    template,
    profile = {},
    debugInfo = {},
  }) {
    this._cwd = cwd;
    this._runtime = runtime;
    this._template = template;
    this._profile = profile;
    this._debugInfo = debugInfo;
  }

  async invoke(identifier, event) {
    const func = this._getFunction(identifier);
    if (!func) {
      console.error(`Error: Cannot find function ${identifier} in template.`);
      process.exit(-1);
    }
    debug(`Found serverless function in template: ${JSON.stringify(func)}`);
    console.info(`Invoking function ${identifier} (${func.runtime}).`);

    const config = this._getInvokeConfig(func);
    await this._runtime.invoke(config, event, this._debugInfo);
  }

  /**
   * Return whether it runs in debug mode.
   */
  isDebugging() {
    return !!this._debugInfo.debugPort;
  }

  _getFunction(identifier) {
    const { functionRes } = findFunctionInTpl(
      identifier.serviceName,
      identifier.functionName,
      this._template
    );
    if (!functionRes) {
      return;
    }
    const properties = functionRes['Properties'];
    return new Function({
      identifier,
      handler: properties.Handler,
      timeout: properties.Timeout,
      runtime: properties.Runtime,
      codeUri: properties.CodeUri,
      memorySize: properties.MemorySize,
      envVars: properties.EnvironmentVariables,
    });
  }

  _getInvokeConfig(func) {
    const codeAbsPath = this._resolveCodePath(this._cwd, func.codeUri);
    debug(`Resolved absolute path to code: ${codeAbsPath}.`);
    const timeout = this.isDebugging() ? MAX_DEBUG_TIMEOUT : func.timeout;
    return new FunctionConfig({
      timeout,
      codeAbsPath,
      region: this._profile.region,
      accountId: this._profile.accountId,
      identifier: func.identifier,
      handler: func.handler,
      runtime: func.runtime,
      memory: func.memorySize,
      envVars: func.envVars,
    });
  }

  _resolveCodePath(cwd, codeUri) {
    if (!path.isAbsolute(codeUri)) {
      if (!cwd || cwd === CURRENT_DIR) {
        cwd = process.cwd();
      }
      cwd = path.resolve(cwd);
      return path.resolve(cwd, codeUri);
    }
    return codeUri;
  }
}

module.exports = LocalRunner;
