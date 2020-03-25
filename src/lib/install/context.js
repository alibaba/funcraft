'use strict';

const { startInstallationContainer } = require('../../lib/docker');
const _ = require('lodash');
const path = require('path');

const nasTargetProtocal = 'nas://';
const fileTargetProtocal = 'file://';

function convertInstallTargetToAbsHostPath(target) {
  if (!target || !_.isString(target)) { throw new Error('invalid target: ' + target); }
  if (target.startsWith(nasTargetProtocal)) { throw new Error('only support \'file://\' protocal for fun.yml target attribute'); }
  
  if (target.startsWith(fileTargetProtocal)) { target = target.substring(fileTargetProtocal.length); }

  const absTarget = path.resolve(target);
  return absTarget;
}

class Context {
  constructor(runtime, codeUri, targets) {
    this.runtime = runtime;
    this.codeUri = codeUri;

    this.targets = {};

    if (targets) {
      let count = 0;
      for (let target of targets) {
        const hostPath = convertInstallTargetToAbsHostPath(target);
        const containerPath = '/install/target' + (++count);
        
        this.targets[target] = {
          hostPath,
          containerPath
        };
      }
    }
    
    return (async () => { await this.setup(); return this; })();
  }

  async setup() {
    this.runner = await startInstallationContainer({ runtime: this.runtime, codeUri: this.codeUri, targets: this.targets });
  }

  async teardown() {
    await this.runner.stop();
    this.runner = undefined;
  }
}

module.exports = Context;