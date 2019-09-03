'use strict';

const Invoke = require('./invoke');
const docker = require('../docker');
const dockerOpts = require('../docker-opts');

class LocalInvoke extends Invoke {
  constructor(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir) {
    super(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir);
  }

  async init() {
    await super.init();

    this.envs = await docker.generateDockerEnvs(this.baseDir, this.functionProps, this.debugPort, null, this.nasConfig, false, this.debugIde);
    this.cmd = docker.generateDockerCmd(this.functionProps, false);
    this.opts = await dockerOpts.generateLocalInvokeOpts(this.runtime,
      this.containerName,
      this.mounts,
      this.cmd,
      this.debugPort,
      this.envs,
      this.dockerUser,
      this.debugIde);
  }

  async doInvoke(event, { outputStream, errorStream } = {}) {
    await docker.run(this.opts,
      event,
      outputStream,
      errorStream);
  }
}

module.exports = LocalInvoke;