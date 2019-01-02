'use strict';

const { startInstallationContainer } = require('../docker');
const { cyan, green } = require('colors');

class Task {
  constructor(name, runtime, codeUri, context) {
    this.name = name;
    this.runtime = runtime;
    this.codeUri = codeUri;
    this.context = context || {};
  }

  async run() {
    await this.beforeRun();
    await this.doRun();
    await this.afterRun();
  }

  async beforeRun() {
    if (!this.context.runner) {
      this.runner = await startInstallationContainer({ runtime: this.runtime, codeUri: this.codeUri });
    } else {
      this.runner = this.context.runner;
    }

  }

  async afterRun() {
    if (!this.context.runner) {
      await this.runner.stop();
    }
  }

  async doRun() {
    console.log(green('Task => ') + cyan('%s'), this.name ? this.name : 'UNNAMED');
  }
}

class InstallTask extends Task {

  constructor(name, runtime, codeUri, pkgName, local, context, verbose = false) {
    super(name, runtime, codeUri, context);
    this.pkgName = pkgName;
    this.local = local;
    this.cacheDir = '/code/.fun/tmp';
    this.verbose = verbose;
  }

  async beforeRun() {
    await super.beforeRun();
    await this.runner.exec(['bash', '-c', `mkdir -p ${this.cacheDir}`]);
  }

  async afterRun() {
    await this.runner.exec(['bash', '-c', `rm -rf ${this.cacheDir}`]);
    await super.afterRun();
  }

}
/**
 * install location: .fun/python/lib/python3.7/site-packages
 */
class PipTask extends InstallTask {
  async doRun() {
    await super.doRun();
    if (this.local){
      const folder = `/code/.fun/python/lib/${this.runtime}/site-packages/`;
      console.log(green('     => ') + cyan('pip install -t %s %s'), folder, this.pkgName);
      await this.runner.exec(['pip', 'install', '-t', folder, this.pkgName], [], this.verbose);
    } else {
      console.log(green('     => ') + cyan('pip install %s'), this.pkgName);
      await this.runner.exec(['pip', 'install', this.pkgName], [], this.verbose);
    }
  }
}

class AptTask extends InstallTask {

  async doRun() {
    await super.doRun();
    if (this.local) {
      await this.update();
      await this.dlPkg(this.pkgName);
      await this.instDeb();
      await this.cleanup();
    } else {
      console.log(green('     => ') + cyan('apt-get install -y %s'), this.pkgName);
      await this.runner.exec(['apt-get', 'install', '-y', this.pkgName], [], this.verbose);
    }
  }

  async update() {
    console.log(green('     => ') + cyan('apt-get update (if need)'));
    await this.runner.exec(['bash', '-c', 
      'if [ -z "$(find /var/cache/apt/pkgcache.bin -mmin -60 2>/dev/null)" ]; then apt-get update; touch /var/cache/apt/pkgcache.bin; fi']
      , [], this.verbose);
  }

  async dlPkg(pkgName) {
    console.log(green('     => ') + cyan('apt-get install -y -d -o=dir::cache=%s %s'), this.cacheDir, pkgName);
    await this.runner.exec(['apt-get', 'install', '-y', '-d', `-o=dir::cache=${this.cacheDir}`, pkgName], [], this.verbose);
  }

  async instDeb() {
    const instDir = '/code/.fun/root';
    console.log(green('     => ') + cyan('bash -c \'for f in $(ls %s/archives/*.deb); do dpkg -x $f %s; done;\''), this.cacheDir, instDir);
    await this.runner.exec(['bash', '-c', `for f in $(ls ${this.cacheDir}/archives/*.deb); do dpkg -x $f ${instDir} ; done;`], [], this.verbose);
  }

  async cleanup() {
    console.log(green('     => ') + cyan('bash -c \'rm -rf %sarchives\''), this.cacheDir);
    await this.runner.exec(['bash', '-c', `rm -rf ${this.cacheDir}/archives`], [], this.verbose);
  }
}

class ShellTask extends Task {
  constructor(name, runtime, codeUri, script, context){
    super(name, runtime, codeUri, context);
    this.script = script;
  }

  async doRun(){
    console.log(green('     => ') + cyan('bash -c  \'%s\''), this.script);
    await this.runner.exec(['bash', '-c', this.script], [], this.verbose);
  }
}

module.exports = {
  Task, InstallTask, PipTask, AptTask, ShellTask
};