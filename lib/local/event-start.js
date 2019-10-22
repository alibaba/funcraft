'use strict';
const Invoke = require('./invoke');
const docker = require('../docker');
const dockerOpts = require('../docker-opts');
const debug = require('debug')('fun:local');

class EventStart extends Invoke {
  constructor(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir, debuggerPath, debugArgs, nasBaseDir) {
    super(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir, debuggerPath, debugArgs, nasBaseDir);
  }

  async init() {
    await super.init();
    this.envs = await docker.generateDockerEnvs(this.baseDir, this.serviceName, this.serviceRes.Properties, this.functionName, this.functionProps, this.debugPort, null, this.nasConfig, false, this.debugIde, this.debugArgs);
    this.containerName = dockerOpts.generateContainerName(this.serviceName, this.functionName, this.debugPort);

    let filters = dockerOpts.generateContainerNameFilter(this.containerName, true);
    let containers = await docker.listContainers({ filters });
    if (!containers || !containers.length) {
      filters = dockerOpts.generateContainerNameFilter(this.containerName);
      containers = await docker.listContainers({ filters });
    }
    if (containers && containers.length) {
      const jobs = [];
      for (let c of containers) {
        const container = await docker.getContainer(c.Id);
        jobs.push(container.stop());
        debug(`stopping container ${c.Id}`);
      }
      await Promise.all(jobs);
      debug('all containers stopped');
    }

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
    console.log('local start succeeded.');
  }
}

module.exports = EventStart;