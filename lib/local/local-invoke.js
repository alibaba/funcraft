'use strict';

const Invoke = require('./invoke');
const docker = require('../docker');
const dockerOpts = require('../docker-opts');

class LocalInvoke extends Invoke {
  constructor(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir, debuggerPath, debugArgs, reuse) {
    super(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir, debuggerPath, debugArgs);
    this.reuse = reuse;
  }

  async init() {
    await super.init();

    this.envs = await docker.generateDockerEnvs(this.baseDir, this.functionProps, this.debugPort, null, this.nasConfig, false, this.debugIde, this.debugArgs);
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
    if (this.reuse) {
      const containerName = dockerOpts.generateContainerName(this.serviceName, this.functionName, this.debugPort);
      let invokeInitializer = true;
      let filters = this.generateContainerNameFilter(containerName, true);
      let containers = await docker.listContainers({ filters });
      if (containers && containers.length) {
        invokeInitializer = false;
      } else {
        filters = this.generateContainerNameFilter(containerName);
        containers = await docker.listContainers({ filters });
      }
      if (containers && containers.length) {
        const container = await docker.getContainer(containers[0].Id);
        const cmd = [dockerOpts.resolveMockScript(this.runtime), ...docker.generateDockerCmd(this.functionProps, false, invokeInitializer, event)];
        const opts = await dockerOpts.generateLocalInvokeOpts(this.runtime,
          this.containerName,
          this.mounts,
          cmd,
          this.debugPort,
          this.envs,
          this.dockerUser,
          this.debugIde);
        await docker.execContainer(container, opts, outputStream, errorStream);
        if (invokeInitializer) {
          await docker.renameContainer(container, containerName + '-inited');
        }
        return;
      }
    }
    await docker.run(this.opts,
      event,
      outputStream,
      errorStream
    );
  }

  generateContainerNameFilter(containerName, inited) {
    if (inited) {
      return `{"name": ["${containerName}-inited"]}`;
    }
    return `{"name": ["${containerName}"]}`;
  }
}

module.exports = LocalInvoke;