/* eslint-disable quotes */

'use strict';

const debug = require('debug')('edge:runtime');
const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');
const Container = require('./container');
const agent = require('./agent');

const stat = util.promisify(fs.stat);
const mkdtemp = util.promisify(fs.mkdtemp);

const EDGE_WORKING_DIR_PREFIX = '/tmp/var/run/functions';
const EDGE_SUPPORTED_RUNTIMES = [
  'nodejs8',
  'python3',
];

class LocalRuntime {

  constructor({ container = Container.edge() } = {}) {
    this.container = container;
  }

  async invoke(config, event, debugInfo = {}) {
    const runtime = config.runtime;
    if (!EDGE_SUPPORTED_RUNTIMES.includes(runtime)) {
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
      `${EDGE_WORKING_DIR_PREFIX}/${identifier.serviceName}/${identifier.functionName}`;
    debug(`Installing code tar archive into ${workingDir} on edge...`);
    await this.container.copy(archive, workingDir);

    // FunctionCompute should be constructed after the container starts.
    const functionCompute = new agent.FunctionCompute();
    await functionCompute.deploy({
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
      pinned: false,
    });

    if (debugPort && debugInfo.outputDebuggerConfigs) {
      const configs = this._getDebuggerConfigs(config.runtime, codeDir, workingDir, debugPort);
      console.log(configs);
    }

    let timer;
    try {
      debug(`Invoking function ${functionId} with ${event}.`);
      const invocation = functionCompute.invoke({
        functionId,
        event,
      });
      const timeout = config.timeout;
      timer = this._configureInterrupt(identifier, timeout, !!debugPort);
      const result = await invocation;
      console.log(result.toString());
    } catch (err) {
      console.log(err);
    }
    if (timer) {
      clearTimeout(timer);
    }
  }

  _configureInterrupt(identifier, timeout, isDebugging) {
    let timer;
    const timeoutHandler = () => {
      console.info(`Function ${identifier} timed out after ${timeout} seconds.`);
      // FIXME Whether should we stop or remove the function at edge?
      process.exit(-1);
    };
    const signalHandler = (signal) => {
      console.info(`Execution of function ${identifier} was interrupted.`);
      if (timer) {
        clearTimeout(timer);
      }
      // FIXME Whether should we stop or remove the function at edge?
      process.exit(-1);
    };
    if (!isDebugging) {
      timer = setTimeout(timeoutHandler, timeout * 1000);
    }
    process.on('SIGINT', signalHandler);
    process.on('SIGTERM', signalHandler);
    return timer;
  }

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
                'remoteRoot': `${workingDir}`,
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

  async _getCodeDir(codePath) {
    const stats = await stat(codePath);
    if (stats.isFile()) {
      return path.dirname(codePath);
    }
    return codePath;
  }

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

  static async _getCodeArchive(codeDir) {
    const stats = await stat(codeDir);
    if (stats.isDirectory()) {
      const os = require('os');
      const path = require('path');
      const basename = path.basename(codeDir);
      const tmpdir = await mkdtemp(path.join(os.tmpdir(), '/'));
      const tarfile = path.join(tmpdir, `${basename}.tar`);

      return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(tarfile, { encoding: 'utf-8', });
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
