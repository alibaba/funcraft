'use strict';
const Invoke = require('./invoke');
const docker = require('../docker');
const dockerOpts = require('../docker-opts');

class EventStart extends Invoke {
  constructor(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir, debuggerPath, debugArgs) {
    super(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir, debuggerPath, debugArgs);
  }

  async init() {
    await super.init();
    this.envs = await docker.generateDockerEnvs(this.baseDir, this.functionProps, this.debugPort, null, this.nasConfig, false, this.debugIde, this.debugArgs);
    this.containerName = dockerOpts.generateContainerName(this.serviceName, this.functionName, this.debugPort);
    this.opts = await dockerOpts.generateLocalStartOpts(this.runtime,
      this.containerName,
      this.mounts,
      ['--server'],
      this.debugPort,
      this.envs,
      this.dockerUser,
      this.debugIde);
    const container = await docker.createAndRunContainer(this.opts);
    await container.logs({
      stdout: true,
      stderr: true,
      follow: true,
      since: (new Date().getTime() / 1000)
    });
  }
}

module.exports = EventStart;