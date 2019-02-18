'use strict';

const { startContainer } = require('../docker');

var AsyncLock = require('async-lock');
var lock = new AsyncLock();

const dockerOpts = require('../docker-opts');

const debug = require('debug')('fun:local');
const streams = require('memory-streams');
const FC_HTTP_PARAMS = 'x-fc-http-params';
const { red } = require('colors');
const { getHttpRawBody, generateHttpParams, parseHttpTriggerHeaders, validateHeader } = require('../local/http');
const docker = require('../docker');
const { validateSignature, parseOutputStream } = require('./http');
const Invoke = require('./invoke');

var watch = require('node-watch');

class HttpInvoke extends Invoke {
  constructor(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, tplPath, authType, endpointPrefix) {
    super(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, tplPath);

    this.isAnonymous = authType === 'ANONYMOUS';
    this.endpointPrefix = endpointPrefix;
  }

  async _disableRunner(evt, name) {
    let oldRunner = null;
    lock.acquire('invoke', (done) => {

      if (!this.runner) {
        done();
        return;
      }

      console.log(`detect code changes, file is ${name}, event is ${evt}, auto reloading...`);

      oldRunner = this.runner;

      this.runner = null;
      this.containerName = docker.generateRamdomContainerName();

      console.log('reloading success, stop old container background...');

      done();

    }, (err, ret) => {
      debug('stop container after lock released');

      oldRunner.stop().catch(reason => {
        console.error('stop container error, reason is ', reason);
      }).finally(() => {
        // release lock
        console.log('stopping old container successfully');
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

            await docker.pullImageIfNeed(this.imageName);

            if (!this.watcher) {
              watch(this.codeMount.Source, { recursive: true, persistent: false }, (evt, name) => {
                if (this.runner) {
                  this._disableRunner(evt, name);
                } else {
                  debug('detect code changes, but no runner found, ignore....');
                }
              });
            }

            const envs = await docker.generateDockerEnvs(this.functionProps, this.debugPort, null);

            const opts = await dockerOpts.generateLocalStartRunOpts(this.runtime,
              this.containerName,
              this.mounts,
              ['--server'],
              this.debugPort,
              envs,
              this.dockerUser);

            this.runner = await startContainer(opts);
          } else {
            debug('acquire invoke lock success, but runner already created, skipping...');
          }
        });
      }
    }
  }

  async doInvoke(req, res) {
    // only one invoke can be processed
    await lock.acquire('invoke', async () => {
      debug('http doInvoke, aquire invoke lock success, processing...');

      const outputStream = new streams.WritableStream();
      const errorStream = new streams.WritableStream();

      const event = await getHttpRawBody(req);

      const httpParams = generateHttpParams(req, this.endpointPrefix);

      const envs = await docker.generateDockerEnvs(this.functionProps, this.debugPort, httpParams);

      if (this.debugPort) {
        // don't reuse container
        const cmd = docker.generateDockerCmd(this.functionProps, true);

        this.containerName = docker.generateRamdomContainerName();

        const opts = await dockerOpts.generateLocalInvokeOpts(
          this.runtime,
          this.containerName,
          this.mounts,
          cmd,
          this.debugPort,
          envs,
          this.dockerUser);

        await docker.run(opts,
          event,
          outputStream, errorStream);
      } else {
        // reuse container
        debug('http doInvoke, acquire invoke lock');

        const cmd = [dockerOpts.resolveMockScript(this.runtime), ...docker.generateDockerCmd(this.functionProps, true)];

        debug(`http doInvoke, cmd is : ${cmd}`);

        if (!this.isAnonymous) {
          // check signature
          if (!await validateSignature(req, res, req.method)) { return; }
        }

        await this.runner.exec(cmd, {
          env: envs,
          event,
          outputStream,
          errorStream,
          verbose: true
        });

        debug('http doInvoke exec end, begin to response');
      }

      this.response(outputStream, errorStream, res);
    });
  }

  // responseHttpTriggers
  response(outputStream, errorStream, res) {
    // todo: real-time processing ?
    const errorResponse = errorStream.toString();

    const { statusCode, headers, body, billedTime, memoryUsage } = parseOutputStream(outputStream);

    // it's function status code and is not http trigger response status code
    if (statusCode && statusCode.startsWith('2')) {
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

module.exports = HttpInvoke;