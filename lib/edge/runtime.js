/* eslint-disable quotes */

'use strict';

const debug = require('debug')('fun:edge:runtime');
const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');
const crc64 = require("crc64-ecma182.js");
const Container = require('./container');
const agent = require('./agent');

const stat = util.promisify(fs.stat);
const mkdtemp = util.promisify(fs.mkdtemp);

/**
 * The prefix of the directory at which the new deployed functions locate.
 *
 * @type {string}
 */
const WORKING_DIR_PREFIX = '/tmp/var/run/functions';

/**
 * The runtimes supported by Link IoT Edge.
 *
 * @type {[string,string]}
 */
const SUPPORTED_RUNTIMES = [
  'nodejs8',
  'python3'
];

/**
 * The class represents a local runtime, which runs the functions code locally and returns
 * results.
 */
class LocalRuntime {

  /**
   * Construct a new LocalRuntime object.
   *
   * @param container a optional container to runs the functions on it.
   */
  constructor({ container = Container.edge() } = {}) {
    this.container = container;
    this.client = new agent.FunctionComputeClient();
  }

  /**
   * Invoke the function with specified event.
   *
   * @param config the config of the function that's invoked.
   * @param event the event that triggers the function.
   * @param debugInfo the info about debugging mode.
   * @returns {Promise.<void>}
   */
  async invoke(config, event, debugInfo = {}) {
    const runtime = config.runtime;
    if (!SUPPORTED_RUNTIMES.includes(runtime)) {
      throw new Error(`Unsupported function runtime ${runtime}.`);
    }

    const debugPort = debugInfo.debugPort;
    const identifier = config.identifier;
    const functionId = this._buildIdString(config.region, config.accountId,
      config.serviceName, config.functionName);
    debug(`Build function id ${functionId}`);
    const codeDir = await this._getCodeDir(config.codeAbsPath);
    const archive = await LocalRuntime._getCodeArchive(codeDir);
    debug(`Code archive tarred at ${archive}.`);
    // Constructing a path matches the target OS.
    const workingDir =
      `${WORKING_DIR_PREFIX}/${identifier.serviceName}/${identifier.functionName}`;
    debug(`Installing code tar archive into ${workingDir} on edge...`);
    await this.container.copy(archive, workingDir);

    const checksum = await this._buildChecksum(archive);
    debug(`Code checksum is ${checksum}.`);

    await this.client.deploy({
      debugPort,
      runtime,
      functionId,
      region: config.region,
      accountId: config.accountId,
      serviceName: identifier.serviceName,
      functionName: identifier.functionName,
      handler: config.handler,
      timeout: config.timeout,
      memory: config.memory,
      envVars: config.envVars,
      codeDir: workingDir,
      codeChecksum: checksum,
      pinned: false
    });

    if (debugPort && debugInfo.outputDebuggerConfigs) {
      const configs = this._getDebuggerConfigs(config.runtime, codeDir, workingDir, debugPort);
      console.log(configs);
    }

    let timer;
    try {
      debug(`Invoking function ${functionId} with ${event}.`);
      const invocation = this.client.invoke({
        functionId,
        event
      });
      const timeout = config.timeout;
      timer = this._configureInterrupt(identifier, timeout, !!debugPort);
      const result = await invocation;
      console.log(result.toString());
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  /**
   * Configure what can interrupt the execution of the function.
   *
   * @param identifier the identifier of the function.
   * @param timeout the timeout for the execution of the function.
   * @param isDebugging whether the execution is in debugging mode.
   * @returns {*} a timer to cancel the timeout interruption.
   * @private
   */
  _configureInterrupt(identifier, timeout, isDebugging) {
    let timer;
    const timeoutHandler = () => {
      // FIXME Whether should we stop or remove the function at edge?
      throw new Error(`Function ${identifier} timed out after ${timeout} seconds.`);
    };
    const signalHandler = (signal) => {
      console.info(`Execution of function ${identifier} was interrupted.`);
      if (timer) {
        clearTimeout(timer);
      }
      // FIXME Whether should we stop or remove the function at edge?
      throw new Error(); // equals to process.exit(-1);
    };
    if (!isDebugging) {
      timer = setTimeout(timeoutHandler, timeout * 1000);
    }
    process.on('SIGINT', signalHandler);
    process.on('SIGTERM', signalHandler);
    return timer;
  }

  /**
   * Return the configurations for debuggers, currently only vscode.
   *
   * @param runtime the runtime of the function.
   * @param hostDir the local path of the function code.
   * @param workingDir the remote path on the container where the function locates.
   * @param debugPort the debug port for debugger to connect.
   * @returns {string} the configurations for debuggers.
   * @private
   */
  _getDebuggerConfigs(runtime, hostDir, workingDir, debugPort) {
    let vscodeConfigs;
    switch (runtime) {
    case 'nodejs8':
      vscodeConfigs = {
        'version': '0.2.0',
        'configurations': [
          {
            'name': 'Attach to Fun (Node.js 8)',
            'type': 'node',
            'request': 'attach',
            'address': 'localhost',
            'port': debugPort,
            'localRoot': `${hostDir}`,
            'remoteRoot': `${workingDir}`,
            'protocol': 'inspector',
            'stopOnEntry': false
          }
        ]
      };
      break;
    case 'python3':
      vscodeConfigs = {
        'version': '0.2.0',
        'configurations': [
          {
            'name': 'Attach to Fun (Python 3)',
            'type': 'python',
            'request': 'attach',
            'host': 'localhost',
            'port': debugPort,
            'pathMappings': [
              {
                'localRoot': `${hostDir}`,
                'remoteRoot': `${workingDir}`
              }
            ]
          }
        ]
      };
      break;
    default:
      break;
    }
    const configs = `
Debugging Configurations
## VS Code ##
${JSON.stringify(vscodeConfigs, null, 4)}
`;
    return configs;
  }

  /**
   * Return the parent directory of the code.
   *
   * @param codePath the path of the code.
   * @returns {Promise.<*>}
   * @private
   */
  async _getCodeDir(codePath) {
    const stats = await stat(codePath);
    if (stats.isFile()) {
      return path.dirname(codePath);
    }
    return codePath;
  }

  /**
   * Build the function id. It's immutable for same config.
   *
   * @param region the region, for example cn-hangzhou.
   * @param accountId the id of the account.
   * @param serviceName the service name to which the function belongs.
   * @param functionName the name of the function.
   * @returns {string} the id for the function.
   * @private
   */
  _buildIdString(region, accountId, serviceName, functionName) {
    // We need a uuid here in fact. But in order to keep the function id fixed,
    // we use a sha256 id instead.
    const sha256 = crypto.createHash('sha256');
    sha256
      .update(region || '')
      .update(accountId || '')
      .update(serviceName || '')
      .update(functionName || '');
    return sha256.digest('hex').substring(0, 32);
  }

  /**
   * Build the rcr64 emca182 checksum for the specified file.
   *
   * @param path the path of the file
   * @returns {Promise}
   * @private
   */
  _buildChecksum(path) {
    return new Promise((resolve, reject) => {
      crc64.crc64File(path, (err, ret) => {
        err ? reject(err) : resolve(ret);
      });
    });
  }

  /**
   * Tar the code into a file. Return the path of the tar file.
   *
   * @param codeDir the directory of the code, which is a absolute one.
   * @returns {Promise} the promise to get the path of the tar file.
   * @private
   */
  static async _getCodeArchive(codeDir) {
    const stats = await stat(codeDir);
    if (stats.isDirectory()) {
      const os = require('os');
      const path = require('path');
      const basename = path.basename(codeDir);
      const tmpdir = await mkdtemp(path.join(os.tmpdir(), '/'));
      const tarfile = path.join(tmpdir, `${basename}.tar`);

      return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(tarfile, { encoding: 'utf-8' });
        output.on('close', () => {
          resolve(tarfile);
        });

        const archive = require('archiver')('tar');
        archive.on('error', (err) => {
          console.error('Taring code archive failed: %s', codeDir);
          reject(err);
        });
        archive.pipe(output);
        archive.directory(codeDir, '');
        archive.finalize();
      });
    }
    throw new Error(`Not a directory at ${codeDir}.`);
  }
}

module.exports = LocalRuntime;
