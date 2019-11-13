'use strict';

const { startContainer } = require('../docker');

var AsyncLock = require('async-lock');
var lock = new AsyncLock();

const dockerOpts = require('../docker-opts');
const rimraf = require('rimraf');
const ignore = require('../../lib/package/ignore');

const debug = require('debug')('fun:local');
const streams = require('memory-streams');
const FC_HTTP_PARAMS = 'x-fc-http-params';
const { red } = require('colors');
const { getHttpRawBody, generateHttpParams, parseHttpTriggerHeaders, validateHeader } = require('../local/http');
const docker = require('../docker');
const { validateSignature, parseOutputStream } = require('./http');
const Invoke = require('./invoke');

var watch = require('node-watch');

function is2xxStatusCode(statusCode) {
  return statusCode && statusCode.startsWith('2');
}

class HttpInvoke extends Invoke {
  constructor(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, authType, endpointPrefix, debuggerPath, debugArgs, nasBaseDir) {
    super(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, null, debuggerPath, debugArgs, nasBaseDir);

    this.isAnonymous = authType === 'ANONYMOUS' || authType === 'anonymous';
    this.endpointPrefix = endpointPrefix;
    this._invokeInitializer = true;

    process.on('SIGINT', () => {
      this.cleanUnzippedCodeDir();
    });
  }

  _disableRunner(evt, name) {
    let oldRunner = null;
    let tmpCodeDir = this.unzippedCodeDir;

    lock.acquire('invoke', (done) => {
      if (!this.runner) {
        done();
        return;
      }

      console.log(`detect code changes, file is ${name}, event is ${evt}, auto reloading...`);

      oldRunner = this.runner;

      this.runner = null;
      this.containerName = docker.generateRamdomContainerName();
      this._invokeInitializer = true;

      setTimeout(() => {
        this.init().then(() => {
          console.log('reloading success, stop old container background...');
          done();
        });
      }, 500); // for mvn, jar will be writen done after a while
    }, (err, ret) => {
      debug('stop container after lock released');

      // https://github.com/alibaba/funcraft/issues/527
      require('promise.prototype.finally').shim();

      oldRunner.stop().catch(reason => {
        console.error('stop container error, reason is ', reason);
      }).finally(() => {
        // release lock
        console.log('stopping old container successfully\n');

        if (tmpCodeDir) {
          rimraf.sync(tmpCodeDir);
          console.log(`clean tmp code dir ${tmpCodeDir} successfully.\n`);
        }
      });
    });
  }

  async beforeInvoke() {
    if (!this.debugPort) {
      // reuse container
      if (!this.runner) {

        debug('runner not created, acquire beforeInvoke lock');

        await lock.acquire('invoke', async () => {

          if (!this.runner) {
            debug('acquire invoke lock success, ready to create runner');

            if (!this.watcher) {
              // add file ignore when auto reloading
              const ign = ignore(this.baseDir);

              this.watcher = watch(this.codeUri, { recursive: true, persistent: false, filter: (f) => {
                return ign && !ign(f);
              }}, (evt, name) => {
                if (this.runner) {
                  this._disableRunner(evt, name);
                } else {
                  debug('detect code changes, but no runner found, ignore....');
                }
              });
            }

            await this._startRunner();
          } else {
            debug('acquire invoke lock success, but runner already created, skipping...');
          }
        });
      }
    }
  }

  async _startRunner() {

    const envs = await docker.generateDockerEnvs(this.baseDir, this.serviceName, this.serviceRes.Properties, this.functionName, this.functionProps, this.debugPort, null, this.nasConfig, true, this.debugIde, this.debugArgs);

    const opts = await dockerOpts.generateLocalStartOpts(this.runtime,
      this.containerName,
      this.mounts,
      ['--server'],
      this.debugPort,
      envs,
      this.dockerUser);

    this.runner = await startContainer(opts, process.stdout, process.stderr, {
      serviceName: this.serviceName,
      functionName: this.functionName
    });
  }

  async initAndStartRunner() {
    await this.init();
    await this._startRunner();
    await this.showDebugIdeTips();
  }

  async doInvoke(req, res) {
    // only one invoke can be processed
    await lock.acquire('invoke', async () => {
      debug('http doInvoke, aquire invoke lock success, processing...');

      const outputStream = new streams.WritableStream();
      const errorStream = new streams.WritableStream();

      const event = await getHttpRawBody(req);

      const httpParams = generateHttpParams(req, this.endpointPrefix);

      const envs = await docker.generateDockerEnvs(this.baseDir, this.serviceName, this.serviceRes.Properties, this.functionName, this.functionProps, this.debugPort, httpParams, this.nasConfig, true, this.debugIde);

      if (this.debugPort && !this.runner) {
        // don't reuse container
        const cmd = docker.generateDockerCmd(this.functionProps, true, event);

        this.containerName = docker.generateRamdomContainerName();

        const opts = await dockerOpts.generateLocalInvokeOpts(
          this.runtime,
          this.containerName,
          this.mounts,
          cmd,
          this.debugPort,
          envs,
          this.dockerUser,
          this.debugIde);

        await docker.run(opts,
          event,
          outputStream, errorStream);
      } else {
        // reuse container
        debug('http doInvoke, acquire invoke lock');

        const cmd = [dockerOpts.resolveMockScript(this.runtime), ...docker.generateDockerCmd(this.functionProps, true, this._invokeInitializer, event)];

        debug(`http doInvoke, cmd is : ${cmd}`);

        if (!this.isAnonymous) {
          // check signature
          if (!await validateSignature(req, res, req.method)) { return; }
        }

        try {
          await this.runner.exec(cmd, {
            env: envs,
            outputStream,
            errorStream,
            verbose: true,
            context: {
              serviceName: this.serviceName,
              functionName: this.functionName
            }
          });

          this._invokeInitializer = false;
        } catch (error) {
          // errors for runtime error
          // for example, when using nodejs, use response.send(new Error('haha')) will lead to runtime error
          // and container will auto exit, exec will receive no message
          res.status(500);
          res.setHeader('Content-Type', 'application/json');

          res.send({
            'errorMessage': `Process exited unexpectedly before completing request`
          });

          // for next invoke
          this.runner = null;
          this.containerName = docker.generateRamdomContainerName();

          console.error(error);
          return;
        }

        debug('http doInvoke exec end, begin to response');
      }

      this.response(outputStream, errorStream, res);
    });
  }

  async afterInvoke() {

  }

  // responseHttpTriggers
  response(outputStream, errorStream, res) {
    // todo: real-time processing ?
    const errorResponse = errorStream.toString();

    const { statusCode, headers, body, billedTime, memoryUsage } = parseOutputStream(outputStream);

    if (this.runtime === 'custom') {
      res.status(statusCode);
      res.set(headers);
      res.send(body);
    } else { // non custom http request
      // it's function status code and is not http trigger response status code
      if (is2xxStatusCode(statusCode)) {
        const base64HttpParams = headers[FC_HTTP_PARAMS];

        const httpParams = parseHttpTriggerHeaders(base64HttpParams);

        res.status(httpParams.status);

        const httpParamsHeaders = httpParams.headersMap || httpParams.headers;
        for (const headerKey in httpParamsHeaders) {
          if (!{}.hasOwnProperty.call(httpParamsHeaders, headerKey)) { continue; }

          const headerValue = httpParamsHeaders[headerKey];

          if (validateHeader(headerKey, headerValue)) {
            res.setHeader(headerKey, headerValue);
          }
        }
        res.send(body);

        if (errorResponse) {
          console.log(red(errorResponse));
        }

      } else {
        console.log(red(errorResponse));
        console.log(red(body));

        res.status(statusCode || 500);
        res.setHeader('Content-Type', 'application/json');

        if (body) {
          res.send(body);
        } else {
          res.send({
            'errorMessage': `Process exited unexpectedly before completing request (duration: ${billedTime}ms, maxMemoryUsage: ${memoryUsage}MB)`
          });
        }
      }
    }
  }
}

module.exports = HttpInvoke;