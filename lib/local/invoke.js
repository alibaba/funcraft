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
    this.nasMounts = await docker.resolveNasConfigToMounts(this.serviceName, this.nasConfig, this.tplPath);
    this.codeMount = await docker.resolveCodeUriToMount(this.codeUri);

    const allMount = [this.codeMount, ...this.nasMounts];

    const isDockerToolBox = await docker.isDockerToolBox();

    if (isDockerToolBox) {

      this.mounts = dockerOpts.detectedToolBoxAndPathTransformation(allMount);
    } else {

      this.mounts = allMount;
    }
    
    debug(`docker mounts: %s`, JSON.stringify(this.mounts, null, 4));
		
    this.containerName = docker.generateRamdomContainerName();

    this.imageName = await dockerOpts.resolveRuntimeToDockerImage(this.runtime);

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
