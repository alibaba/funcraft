'use strict';

const definition = require('../definition');
const docker = require('../docker');
const dockerOpts = require('../docker-opts');
const debug = require('debug')('fun:local');
const path = require('path');
const fs = require('fs-extra');
const rimraf = require('rimraf');
const unzipper = require('unzipper');
const tmpDir = require('temp-dir');
const uuid = require('uuid');
const { DEFAULT_NAS_PATH_SUFFIX } = require('../tpl');

const _ = require('lodash');

function isZipArchive(codeUri) {
  return codeUri.endsWith('.zip') || codeUri.endsWith('.jar') || codeUri.endsWith('.war');
}

async function processZipCodeIfNecessary(codeUri) {

  if (isZipArchive(codeUri)) {
    const stream = fs.createReadStream(codeUri);

    const tmpCodeDir = path.join(tmpDir, uuid.v4());

    await fs.ensureDir(tmpCodeDir);

    console.log(`codeUri is a zip format, will unzipping to ${tmpCodeDir}`);

    await stream.pipe(unzipper.Extract({ path: tmpCodeDir })).promise();
    return tmpCodeDir;
  } 

  return null;
}

class Invoke {

  constructor(serviceName, serviceRes, functionName, functionRes, debugPort, debugIde, baseDir, tmpDir, debuggerPath, debugArgs, nasBaseDir) {
    this.serviceName = serviceName;
    this.serviceRes = serviceRes;
    this.functionName = functionName;
    this.functionRes = functionRes;
    this.functionProps = functionRes.Properties;
    this.debugPort = debugPort;
    this.debugIde = debugIde;
    this.nasBaseDir = nasBaseDir;

    this.runtime = this.functionProps.Runtime;
    this.baseDir = baseDir;
    this.codeUri = path.resolve(this.baseDir, this.functionProps.CodeUri);
    this.tmpDir = tmpDir;
    this.debuggerPath = debuggerPath;
    this.debugArgs = debugArgs;
  }

  async invoke() {
    if (!this.inited) {
      await this.init();
    }

    await this.beforeInvoke();
    await this.showDebugIdeTips();
    await this.doInvoke(...arguments);
    await this.afterInvoke();
  }

  async init() {
    this.nasConfig = definition.findNasConfigInService(this.serviceRes);
    this.dockerUser = await docker.resolveDockerUser(this.nasConfig);
    this.nasMounts = await docker.resolveNasConfigToMounts(this.serviceName, this.nasConfig, this.nasBaseDir || path.join(this.baseDir, DEFAULT_NAS_PATH_SUFFIX));
    this.unzippedCodeDir = await processZipCodeIfNecessary(this.codeUri);
    this.codeMount = await docker.resolveCodeUriToMount(this.unzippedCodeDir || this.codeUri);
    this.tmpDirMount = await docker.resolveTmpDirToMount(this.tmpDir);
    this.debuggerMount = await docker.resolveDebuggerPathToMount(this.debuggerPath);

    const allMount = [this.codeMount, ...this.nasMounts];

    if (!_.isEmpty(this.tmpDirMount)) {
      allMount.push(this.tmpDirMount);
    }

    if (!_.isEmpty(this.debuggerMount)) {
      allMount.push(this.debuggerMount);
    }

    const isDockerToolBox = await docker.isDockerToolBoxAndEnsureDockerVersion();

    if (isDockerToolBox) {
      this.mounts = dockerOpts.transformMountsForToolbox(allMount);
    } else {
      this.mounts = allMount;
    }

    debug(`docker mounts: %s`, JSON.stringify(this.mounts, null, 4));

    this.containerName = docker.generateRamdomContainerName();

    this.imageName = await dockerOpts.resolveRuntimeToDockerImage(this.runtime);

    await docker.pullImageIfNeed(this.imageName);

    this.inited = true;
  }

  async beforeInvoke() {

  }

  async showDebugIdeTips() {
    if (this.debugPort && this.debugIde) {
      // not show tips if debugIde is null
      if (this.debugIde === 'vscode') {
        await docker.showDebugIdeTipsForVscode(this.serviceName, this.functionName, this.runtime, this.codeMount.Source, this.debugPort);
      } else if (this.debugIde === 'pycharm') {
        await docker.showDebugIdeTipsForPycharm(this.codeMount.Source, this.debugPort);
      }
    }
  }

  cleanUnzippedCodeDir() {
    if (this.unzippedCodeDir) {
      rimraf.sync(this.unzippedCodeDir);
      console.log(`clean tmp code dir ${this.unzippedCodeDir} successfully`);
      this.unzippedCodeDir = null;
    }
  }

  async afterInvoke() {
    this.cleanUnzippedCodeDir();
  }
}

module.exports = Invoke;
