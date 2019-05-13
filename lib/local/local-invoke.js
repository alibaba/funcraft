'use strict';

const Invoke = require('./invoke');
const docker = require('../docker');
const dockerOpts = require('../docker-opts');

class LocalInvoke extends Invoke {
  constructor(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, tplPath) {
    super(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, tplPath);
  }

  async init() {
    await super.init();

    this.envs = await docker.generateDockerEnvs(this.functionProps, this.debugPort, null);
    this.cmd = docker.generateDockerCmd(this.functionProps, false);
    this.opts = await dockerOpts.generateLocalInvokeOpts(this.runtime,
      this.containerName,
      this.mounts,
      this.cmd,
      this.debugPort,
      this.envs,
      this.dockerUser);
  }

  async doInvoke(event, { outputStream, errorStream } = {}) {
    await docker.run(this.opts,
      event,
      outputStream,
      errorStream);
  }
}

module.exports = LocalInvoke;