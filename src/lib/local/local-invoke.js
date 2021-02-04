'use strict';

const Invoke = require('./invoke');
const docker = require('../docker');
const dockerOpts = require('../docker-opts');
const { getFcReqHeaders, generateInitRequestOpts, requestUntilServerUp, generateInvokeRequestOpts } = require('./http');
const uuid = require('uuid');
const { isCustomContainerRuntime } = require('../common/model/runtime');
const debug = require('debug')('fun:local');


class LocalInvoke extends Invoke {
  constructor(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir, debuggerPath, debugArgs, reuse, nasBaseDir) {
    super(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir, debuggerPath, debugArgs, nasBaseDir);
    this.reuse = reuse;
  }

  async init() {
    await super.init();

    this.envs = await docker.generateDockerEnvs(this.baseDir, this.serviceName, this.serviceRes.Properties, this.functionName, this.functionProps, this.debugPort, null, this.nasConfig, false, this.debugIde, this.debugArgs);
    this.cmd = docker.generateDockerCmd(this.runtime, false, {
      functionProps: this.functionProps,
      httpMode: false
    });
    if (isCustomContainerRuntime(this.runtime)) {
      this.opts = await dockerOpts.generateLocalStartOpts(this.runtime,
        this.containerName,
        this.mounts,
        this.cmd,
        this.envs,
        {
          debugPort: this.debugPort,
          dockerUser: this.dockerUser,
          debugIde: this.debugIde,
          imageName: this.imageName,
          caPort: this.functionProps.CAPort
        });
    } else {
      this.opts = await dockerOpts.generateLocalInvokeOpts(this.runtime,
        this.containerName,
        this.mounts,
        this.cmd,
        this.debugPort,
        this.envs,
        this.dockerUser,
        this.debugIde);
    }
  }

  async doInvoke(event, { outputStream, errorStream } = {}) {
    let invokeInitializer = true;
    let containerUp = false;
    if (this.reuse) {
      const containerName = dockerOpts.generateContainerName(this.serviceName, this.functionName, this.debugPort);
      let filters = dockerOpts.generateContainerNameFilter(containerName, true);
      let containers = await docker.listContainers({ filters });
      if (containers && containers.length) {
        invokeInitializer = false;
      } else {
        filters = dockerOpts.generateContainerNameFilter(containerName);
        containers = await docker.listContainers({ filters });
      }
      if (containers && containers.length) {
        const container = await docker.getContainer(containers[0].Id);
        if (isCustomContainerRuntime(this.runtime)) {
          if (this.functionProps.Initializer && invokeInitializer) {
            await docker.renameContainer(container, containerName + '-inited');
          }

          containerUp = true;
        } else {
          const cmd = [dockerOpts.resolveMockScript(this.runtime), ...docker.generateDockerCmd(this.runtime, false, { 
            functionProps: this.functionProps, 
            httpMode: false, 
            invokeInitializer: invokeInitializer, 
            event: event
          })];
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
    }
    if (isCustomContainerRuntime(this.runtime)) {
      let container;
      if (!containerUp) {
        const containerRunner = await docker.runContainer(this.opts,
          outputStream,
          errorStream,
          {
            serviceName: this.serviceName,
            functionName: this.functionName
          }
        );
        container = containerRunner.container;
      }
      // send request
      const fcReqHeaders = getFcReqHeaders({}, uuid.v4(), this.envs);
      if (this.functionProps.Initializer && invokeInitializer) {
        console.log('Initializing...');
        const initRequestOpts = generateInitRequestOpts({}, this.functionProps.CAPort, fcReqHeaders);

        const initResp = await requestUntilServerUp(initRequestOpts, this.functionProps.InitializationTimeout || 3);
        invokeInitializer = false;
        console.log(initResp.body);
        debug(`Response of initialization is: ${JSON.stringify(initResp)}`);
      }

      const requestOpts = generateInvokeRequestOpts(this.functionProps.CAPort, fcReqHeaders, event);

      const respOfCustomContainer = await requestUntilServerUp(requestOpts, this.functionProps.Timeout || 3);
      console.log(respOfCustomContainer.body);
      // exit container
      if (!containerUp) {
        await docker.exitContainer(container);
      }
    } else {
      await docker.run(this.opts,
        event,
        outputStream,
        errorStream,
        {
          serviceName: this.serviceName,
          functionName: this.functionName
        }
      );
    }
    
  }
}

module.exports = LocalInvoke;