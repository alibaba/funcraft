'use strict';

const { startInstallationContainer } = require('../../lib/docker');

class Context {
  constructor(runtime, codeUri) {
    this.runtime = runtime;
    this.codeUri = codeUri;
    return (async () => { await this.setup(); return this; })();
  }

  async setup() {
    this.runner = await startInstallationContainer({ runtime: this.runtime, codeUri: this.codeUri });
  }

  async teardown() {
    await this.runner.stop();
    this.runner = undefined;
  }
}

module.exports = Context;