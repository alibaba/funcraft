'use strict';

const Invoke = require('./invoke');
const streams = require('memory-streams');
const { parseOutputStream } = require('./http');

const { validateSignature, getHttpRawBody } = require('./http');
const { red } = require('colors');
const docker = require('../docker');
const dockerOpts = require('../docker-opts');

class ApiInvoke extends Invoke {

  constructor(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, debuggerPath, debugArgs, nasBaseDir) {
    super(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, null, debuggerPath, debugArgs, nasBaseDir);
  }

  async init() {
    await super.init();

    this.envs = await docker.generateDockerEnvs(this.baseDir, this.serviceName, this.serviceRes.Properties, this.functionName, this.functionProps, this.debugPort, null, this.nasConfig, true, this.debugIde, this.debugArgs);
    this.cmd = docker.generateDockerCmd(this.functionProps, true);
    this.opts = await dockerOpts.generateLocalInvokeOpts(this.runtime, 
      this.containerName, 
      this.mounts, 
      this.cmd, 
      this.debugPort,
      this.envs, 
      this.dockerUser,
      this.debugIde);
  }

  async doInvoke(req, res) {
    const event = await getHttpRawBody(req);

    const outputStream = new streams.WritableStream();
    const errorStream = new streams.WritableStream();

    // check signature
    if (!await validateSignature(req, res, req.method)) { return; }

    await docker.run(this.opts,
      event,
      outputStream,
      errorStream);

    this.response(outputStream, errorStream, res);
  }

  // responseApi
  response(outputStream, errorStream, res) {
    const errorResponse = errorStream.toString();

    let { statusCode, body, requestId, billedTime, memoryUsage } = parseOutputStream(outputStream);

    const headers = {
      'content-type': 'application/octet-stream',
      'x-fc-request-id': requestId,
      'x-fc-invocation-duration': billedTime,
      'x-fc-invocation-service-version': 'LATEST',
      'x-fc-max-memory-usage': memoryUsage,
      'access-control-expose-headers': 'Date,x-fc-request-id,x-fc-error-type,x-fc-code-checksum,x-fc-invocation-duration,x-fc-max-memory-usage,x-fc-log-result,x-fc-invocation-code-version'
    };

    res.status(statusCode);

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