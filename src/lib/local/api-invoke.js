'use strict';

const Invoke = require('./invoke');
const streams = require('memory-streams');
const { parseOutputStream, getFcReqHeaders } = require('./http');
const debug = require('debug')('fun:local');
const { validateSignature, getHttpRawBody, generateInitRequestOpts, requestUntilServerUp, generateInvokeRequestOpts } = require('./http');
const { red, yellow } = require('colors');
const docker = require('../docker');
const dockerOpts = require('../docker-opts');
const uuid = require('uuid');
const { isCustomContainerRuntime } = require('../common/model/runtime');
const isWin = process.platform === 'win32';
class ApiInvoke extends Invoke {

  constructor(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir, debuggerPath, debugArgs, nasBaseDir) {
    super(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir, debuggerPath, debugArgs, nasBaseDir);
  }

  async init() {
    await super.init();
    this.envs = await docker.generateDockerEnvs(this.baseDir, this.serviceName, this.serviceRes.Properties, this.functionName, this.functionProps, this.debugPort, null, this.nasConfig, true, this.debugIde, this.debugArgs);
    this.invokeInitializer = this.functionProps.Initializer ? true : false;
  }
  async beforeInvoke() {
    if (!this.runner) {
      if (!isCustomContainerRuntime(this.runtime)) {
        debug('runner not created, preparing for starting runner.');
        await this._startRunner();
      }
    }
  }

  async _startRunner() {
    // start runner for non-custom-runtime function
    const startCmd = docker.generateDockerCmd(this.runtime, true, { 
      functionProps: this.functionProps
    });

    const opts = await dockerOpts.generateLocalStartOpts(this.runtime,
      this.containerName,
      this.mounts,
      startCmd,
      this.envs,
      {
        debugPort: this.debugPort,
        dockerUser: this.dockerUser,
        imageName: this.imageName,
        caPort: this.functionProps.CAPort
      });
    this.runner = await docker.startContainer(opts, process.stdout, process.stderr, {
      serviceName: this.serviceName,
      functionName: this.functionName
    });
  }

  async _disableRunner() {
    if (!this.runner) {
      return;
    }
    let oldRunner = this.runner;
    this.runner = null;
    await oldRunner.stop();
  }

  async doInvoke(req, res) {
    const containerName = docker.generateRamdomContainerName();
    const event = await getHttpRawBody(req);

    const outputStream = new streams.WritableStream();
    const errorStream = new streams.WritableStream();

    // check signature
    if (!await validateSignature(req, res, req.method)) { return; }
    if (isCustomContainerRuntime(this.runtime)) {
      const cmd = docker.generateDockerCmd(this.runtime, false, {
        functionProps: this.functionProps,
        httpMode: true,
        invokeInitializer: this.invokeInitializer
      });
      const opts = await dockerOpts.generateLocalStartOpts(this.runtime, 
        containerName,
        this.mounts,
        cmd,
        this.envs,
        {
          debugPort: this.debugPort,
          dockerUser: this.dockerUser, 
          debugIde: this.debugIde, 
          imageName: this.imageName, 
          caPort: this.functionProps.CAPort
        }
      );
      const containerRunner = await docker.runContainer(opts, outputStream, errorStream, {
        serviceName: this.serviceName,
        functionName: this.functionName
      });

      const container = containerRunner.container;

      // send request
      const fcReqHeaders = getFcReqHeaders({}, uuid.v4(), this.envs);
      if (this.functionProps.Initializer) {
        console.log('Initializing...');
        const initRequestOpts = generateInitRequestOpts({}, this.functionProps.CAPort, fcReqHeaders);
  
        const initResp = await requestUntilServerUp(initRequestOpts, this.functionProps.InitializationTimeout || 3);
        console.log(initResp.body);
        debug(`Response of initialization is: ${JSON.stringify(initResp)}`);
      }

      const requestOpts = generateInvokeRequestOpts(this.functionProps.CAPort, fcReqHeaders, event);

      const respOfCustomContainer = await requestUntilServerUp(requestOpts, this.functionProps.Timeout || 3);

      // exit container
      this.responseOfCustomContainer(res, respOfCustomContainer);
      await docker.exitContainer(container);
    } else {
      const cmd = [dockerOpts.resolveMockScript(this.runtime), ...docker.generateDockerCmd(this.runtime, false, {
        functionProps: this.functionProps,
        httpMode: true,
        invokeInitializer: this.invokeInitializer,
        event: isWin ? event : null
      })];

      try {
        await this.runner.exec(cmd, {
          env: this.envs,
          outputStream,
          errorStream,
          verbose: true,
          context: {
            serviceName: this.serviceName,
            functionName: this.functionName
          },
          event: !isWin ? event : null
        });
      } catch (error) {
        console.log(red('Fun Error: ', errorStream.toString()));

        // errors for runtime error
        // for example, when using nodejs, use response.send(new Error('haha')) will lead to runtime error
        // and container will auto exit, exec will receive no message
        res.status(500);
        res.setHeader('Content-Type', 'application/json');

        res.send({
          'errorMessage': `Process exited unexpectedly before completing request`
        });

        if (error.indexOf && error.indexOf('exited with code 137') > -1) { // receive signal SIGKILL http://tldp.org/LDP/abs/html/exitcodes.html
          debug(error);
        } else {
          console.error(error);
        }
        if (this.runner) {
          debug('api invoke done, preparing for disabling runner.');
          await this._disableRunner();
        }
        return;
      }
      if (this.runner) {
        debug('api invoke done, preparing for disabling runner.');
        await this._disableRunner();
      }
      this.response(outputStream, errorStream, res);
    }
  }
  responseOfCustomContainer(res, resp) {
    var { statusCode, headers, body } = resp;
    res.status(statusCode);
    res.set(headers);
    res.send(body);
  }
  // responseApi
  response(outputStream, errorStream, res) {
    const errorResponse = errorStream.toString();
    // 当容器的输出为空异常时
    if (outputStream.toString() === '') {
      console.log(yellow('Warning: outputStream of CA container is empty'));
    }

    let { statusCode, body, requestId, billedTime, memoryUsage } = parseOutputStream(outputStream);

    const headers = {
      'content-type': 'application/octet-stream',
      'x-fc-request-id': requestId,
      'x-fc-invocation-duration': billedTime,
      'x-fc-invocation-service-version': 'LATEST',
      'x-fc-max-memory-usage': memoryUsage,
      'access-control-expose-headers': 'Date,x-fc-request-id,x-fc-error-type,x-fc-code-checksum,x-fc-invocation-duration,x-fc-max-memory-usage,x-fc-log-result,x-fc-invocation-code-version'
    };

    if (statusCode) {
      res.status(statusCode);
    } else {
      res.status(500);
    }
    

    // todo: fix body 后面多个换行的 bug
    if (errorResponse) { // process HandledInvocationError and UnhandledInvocationError
      headers['content-type'] = 'application/json';

      console.error(red(errorResponse));

      if (body.toString()) {
        headers['x-fc-error-type'] = 'HandledInvocationError';
      } else {
        headers['x-fc-error-type'] = 'UnhandledInvocationError';
        body = {
          'errorMessage': `Process exited unexpectedly before completing request (duration: ${billedTime}ms, maxMemoryUsage: ${memoryUsage}MB)`
        };
      }
    }

    res.set(headers);
    res.send(body);
  }
}

module.exports = ApiInvoke;