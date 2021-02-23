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

class ApiInvoke extends Invoke {

  constructor(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir, debuggerPath, debugArgs, nasBaseDir) {
    super(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir, debuggerPath, debugArgs, nasBaseDir);
  }

  async init() {
    await super.init();
    this.envs = await docker.generateDockerEnvs(this.baseDir, this.serviceName, this.serviceRes.Properties, this.functionName, this.functionProps, this.debugPort, null, this.nasConfig, true, this.debugIde, this.debugArgs);
  }

  async doInvoke(req, res) {
    const containerName = docker.generateRamdomContainerName();
    const event = await getHttpRawBody(req);
    var invokeInitializer = false;
    if (this.functionProps.Initializer) { invokeInitializer = true; }
    this.cmd = docker.generateDockerCmd(this.runtime, false, {
      functionProps: this.functionProps,
      httpMode: true,
      invokeInitializer
    });

    const outputStream = new streams.WritableStream();
    const errorStream = new streams.WritableStream();

    // check signature
    if (!await validateSignature(req, res, req.method)) { return; }
    if (isCustomContainerRuntime(this.runtime)) {
      const opts = await dockerOpts.generateLocalStartOpts(this.runtime, 
        containerName,
        this.mounts,
        this.cmd,
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

      const opts = await dockerOpts.generateLocalInvokeOpts(this.runtime,	
        containerName,
        this.mounts,
        this.cmd,
        this.debugPort,
        this.envs,
        this.dockerUser,
        this.debugIde);
      await docker.run(opts,
        event,
        outputStream,
        errorStream);
  
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