'use strict';

const definition = require('../definition');
const docker = require('../docker');
const dockerOpts = require('../docker-opts');
const debug = require('debug')('fun:local');

class Invoke {

  constructor(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, tplPath) {
    this.serviceName = serviceName;
    this.serviceRes = serviceRes;
    this.functionName = functionName;
    this.functionRes = functionRes;
    this.functionProps = functionRes.Properties;
    this.debugPort = debugPort;
    this.debugIde = debugIde;
    this.tplPath = tplPath;

    this.runtime = this.functionProps.Runtime;
    this.codeUri = this.functionProps.CodeUri;
  }

  async invoke() {
    if (!this.inited) {
      await this.init();
      this.inited = true;
    }
		
    await this.beforeInvoke();
    await this.showDebugIdeTips();
    await this.doInvoke(...arguments);
    await this.afterInvoke();
  }

  async init() {
    this.nasConfig = definition.findNasConfigInService(this.serviceRes);
    this.dockerUser = await docker.resolveDockerUser(this.nasConfig);
    this.nasMount = await docker.resolveNasConfigToMount(this.nasConfig, this.tplPath);
    this.codeMount = await docker.resolveCodeUriToMount(this.codeUri);

    this.mounts = [];

    this.mounts.push(this.codeMount);

    if (this.nasMount) {
      this.mounts.push(this.nasMount);
    }

    debug(`docker mounts: %s`, JSON.stringify(this.mounts, null, 4));
		
    this.containerName = docker.generateRamdomContainerName();

    this.imageName = dockerOpts.resolveRuntimeToDockerImage(this.runtime);

    await docker.pullImageIfNeed(this.imageName);
  }

  async beforeInvoke() {

  }

  async showDebugIdeTips() {
    if (this.debugPort && this.debugIde) {
      await docker.showDebugIdeTips(this.serviceName, this.functionName, this.runtime, this.codeMount.Source, this.debugPort);
    }
  }

  async afterInvoke() {

  }
}

module.exports = Invoke;
