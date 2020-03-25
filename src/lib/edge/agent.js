'use strict';

const debug = require('debug')('fun:edge:agent');
const https = require('https');

/**
 * A client for requesting function compute service in Link IoT Edge.
 */
class FunctionComputeClient {

  /**
   * Create a new client.
   */
  constructor() {
    this._agent = new https.Agent({ keepAlive: true });
    // Wrapping the promise with a function due to we want it to be lazy to execute.
    this._login = () => {
      if (!this._p) {
        this._p = this.login();
      }
      return this._p;
    };
  }

  /**
   * Build parameters to meet the open APIs parameter requirements.
   *
   * @param data the content.
   * @returns {Object}
   *
   * @private
   */
  _buildParams(data) {
    return {
      id: 'id',
      version: '1.0',
      request: {
        apiVer: '0.6'
      },
      params: data
    };
  }

  /**
   * Authenticate the client.
   *
   * @returns {Promise<Void>}
   */
  async login() {
    const params = JSON.stringify(
      this._buildParams({
        UserName: 'admin',
        Password: 'admin1234'
      })
    );
    const options = {
      method: 'POST',
      host: 'localhost',
      port: '9999',
      path: '/auth/login',
      agent: this._agent,
      rejectUnauthorized: false
    };
    debug(`Logging in: ${params}.`);
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        const cookie = res.headers['set-cookie'];
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          debug(`Login back: ${raw}.`);
          try {
            let parsed = JSON.parse(raw);
            if (parsed.code === 200) {
              debug(`Login successfully and got cookie ${cookie}.`);
              resolve(cookie);
            } else {
              reject(new Error(`${parsed.message}`));
            }
          } catch (err) {
            reject(new Error('Server Internal Error'));
          }
        });
      });
      req.on('error', (e) => {
        console.error(`Request to login error: ${e}`);
        reject(e);
      });
      req.write(params);
      req.end();
    });
  }

  /**
   * Deploy a function.
   *
   * @param functionId the id of the function.
   * @param serviceName the name of the service.
   * @param functionName the name of the function.
   * @param handler the event handler.
   * @param runtime the runtime for the function. May be nodejs8, python3, c etc.
   * @param timeout the maximum execution time of event handler.
   * @param memory the maximum memory size in megabyte that the function can used.
   * @param codeDir the path where the code is at.
   * @param codeChecksum the crc64-ecma182 checksum of the code archive.
   * @param accountId the id of the account, to which this function belongs.
   * @param region the region of the function.
   * @param pinned whether the function is pinned or not. A pinned function is so-called
   *               'long-lived' function.
   * @param envVars the environment variables.
   * @param debugPort the port for debugger to listen.
   * @returns {Promise}
   */
  async deploy({
    functionId,
    serviceName,
    functionName,
    handler,
    runtime,
    timeout,
    memory,
    codeDir,
    codeChecksum = undefined,
    accountId = undefined,
    region = undefined,
    pinned = false,
    envVars = undefined,
    debugPort = undefined
  }) {
    if (!functionId && (!serviceName || !functionName)) {
      throw new Error(`Neither Function id nor serviceName/functionName is provided.`);
    }
    const content = {
      DeployParams: {
        functions: [{
          debugPort,
          runEnv: debugPort ? 'develop' : 'release',
          codePath: codeDir,
          config: {
            handler,
            timeout,
            functionId,
            accountId,
            serviceName,
            functionName,
            codeChecksum,
            memorySize: memory * 1000 * 1000,
            regionId: region,
            fcRuntime: runtime,
            runMode: pinned ? 'LongLived' : 'OnDemand'
          }
        }]
      }
    };
    if (envVars) {
      content.DeployParams.functions[0].config.environment = {
        variables: Object.assign({}, envVars)
      };
    }
    const params = JSON.stringify(this._buildParams(content));
    const cookie = await this._login();
    const options = {
      method: 'POST',
      host: 'localhost',
      port: '9999',
      path: '/function_compute/deploy',
      headers: {
        cookie
      },
      agent: this._agent,
      rejectUnauthorized: false
    };

    debug(`Deploying: ${params}.`);

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          debug(`Deploy back: ${raw}.`);
          try {
            let parsed = JSON.parse(raw);
            if (parsed.code === 200) {
              resolve();
            } else {
              reject(new Error(`${parsed.message}`));
            }
          } catch (err) {
            reject(new Error('Server Internal Error'));
          }
        });
      });
      req.on('error', (e) => {
        console.error(`Request to deploy error: ${e}`);
        reject(e);
      });
      req.write(params);
      req.end();
    });
  }

  /**
   * Invoke a function.
   *
   * @param functionId the id of the function.
   * @param functionName the name of the function.
   * @param serviceName the name of the service in which the function is.
   * @param accountId the id of the account to which the function belongs.
   * @param region the region of the function.
   * @param invokerContext the invoker context, which can be used to provide additional
   *                       information about invoker.
   * @param event the event that would be passed to the function.
   * @param invocationType the type of the invocation. Can be 'Sync' or 'Async'.
   * @param timeout the maximum time to return. Default is 70.
   * @returns {Promise}
   */
  async invoke({
    functionId,
    functionName,
    serviceName,
    accountId = undefined,
    region = undefined,
    invokerContext = '',
    event = '{}',
    invocationType = 'Sync'
  }) {
    if (!functionId && (!serviceName || !functionName)) {
      throw new Error(`Neither Function id nor serviceName/functionName is provided.`);
    }
    if (invocationType !== 'Sync' && invocationType !== 'Async') {
      throw new Error(
        `Incorrect invocationType ${invocationType}. It should be 'Sync' or 'Async'`
      );
    }
    const base64Event = Buffer.from(event).toString('base64');
    const content = {
      InvokeParams: {
        accountId,
        functionId,
        serviceName,
        functionName,
        invocationType,
        regionId: region,
        context: invokerContext,
        payload: base64Event
      }
    };
    const params = JSON.stringify(this._buildParams(content));
    const cookie = await this._login();
    const options = {
      method: 'POST',
      host: 'localhost',
      port: '9999',
      path: '/function_compute/invoke',
      headers: {
        cookie
      },
      agent: this._agent,
      rejectUnauthorized: false
    };

    debug(`Invoking: ${params}.`);

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          debug(`Invoke back: ${raw}.`);
          try {
            let parsed = JSON.parse(raw);
            if (parsed.code === 200) {
              const ret = parsed.data && Buffer.from(parsed.data, 'base64');
              resolve(ret);
            } else {
              reject(new Error(`${parsed.message}`));
            }
          } catch (err) {
            reject(new Error('Server Internal Error'));
          }
        });
      });
      req.on('error', (e) => {
        console.error(`Request to invoke error: ${e}`);
        reject(e);
      });
      req.write(params);
      req.end();
    });
  }
}

module.exports = {
  FunctionComputeClient
};