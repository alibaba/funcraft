/* eslint-disable indent */

'use strict';

const path = require('path');
const debug = require('debug')('fun:edge:runner');

const { findFunctionInTpl } = require('../definition');
const Function = require('../function');
const FunctionConfig = require('./config');

/**
 * Maximum timeout for functions when debugging.
 *
 * @type {number}
 */
const MAX_DEBUG_TIMEOUT = 36000;

/**
 * Constant for the current directory.
 *
 * @type {string}
 */
const CURRENT_DIR = '.';

/**
 * Run functions locally. This class is a wrapper of LocalRuntime, which runs functions
 * on containers actually.
 */
class LocalRunner {
  constructor({
    cwd,
    runtime,
    template,
    profile = {},
    debugInfo = {}
  }) {
    this._cwd = cwd;
    this._runtime = runtime;
    this._template = template;
    this._profile = profile;
    this._debugInfo = debugInfo;
  }

  /**
   * Invoke a function with specified event.
   *
   * @param identifier the identifier of the function.
   * @param event the event which triggers the function.
   * @returns {Promise.<void>}
   */
  async invoke(identifier, event) {
    const func = this._getFunction(identifier);
    if (!func) {
      throw new Error(`Error: Cannot find function ${identifier} in template.`);
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

  /**
   * Return the function metadata from the template.yaml.
   *
   * @param identifier the identifier of the function.
   * @returns {*} the function metadata.
   * @private
   */
  _getFunction(identifier) {
    const { functionRes } = findFunctionInTpl(
      `${identifier.serviceName}/${identifier.functionName}`,
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
      envVars: properties.EnvironmentVariables
    });
  }

  /**
   * Return a function config, which is constructed based on function metadata.
   *
   * @param func the metadata of the function.
   * @returns {FunctionConfig} the function config.
   * @private
   */
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
      envVars: func.envVars
    });
  }

  /**
   * Resolve code path to be a absolute one.
   *
   * @param cwd the current working directory.
   * @param codeUri the code uri, which can be a local path(relative or absolute), a url, etc.
   * @returns {*} the absolute path of the code uri.
   * @private
   */
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
