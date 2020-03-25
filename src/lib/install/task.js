'use strict';

const docker = require('../docker');
const { cyan, green } = require('colors');
const path = require('path');

class Task {
  constructor(name, runtime, codeUri, env = {}, context = null, verbose = false) {
    this.name = name;
    this.runtime = runtime;
    this.codeUri = codeUri;
    this.env = env;
    this.context = context || {};
    this.verbose = verbose;
  }

  async run() {
    await this.beforeRun();
    await this.doRun();
    await this.afterRun();
  }

  async beforeRun() {
    if (!this.context.runner) {
      this.runner = await docker.startInstallationContainer({ runtime: this.runtime, codeUri: this.codeUri, targets: this.context.targets });
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
    console.log(green('Task => ') + cyan('%s'), this.name ? this.name : '[UNNAMED]');
  }
}

class InstallTask extends Task {

  constructor(name, runtime, codeUri, pkgName, local, target, env, context, verbose) {
    super(name, runtime, codeUri, env, context, verbose);
    this.pkgName = pkgName;
    this.local = local;

    if (target) {
      const resolvedTarget = context.targets[target];

      if (!resolvedTarget) { throw new Error('could not resolve target' + target); }
  
      this.target = resolvedTarget.containerPath;
    }
  }

  async _exec(cmd, env) {
    await this.runner.exec(cmd, { env: (env ? env : this.env), verbose: this.verbose });
  }
}

/**
 * install location: .fun/python/lib/python3.7/site-packages
 */
class PipTask extends InstallTask {
  async doRun() {
    await super.doRun();
    if (this.local || this.target) {
      let pythonUserBase = path.posix.join(this.target || '/code/.fun', 'python');

      console.log(green('     => ') + cyan(`PYTHONUSERBASE=${pythonUserBase} pip install --user %s`), this.pkgName);

      await this._exec(['pip', 'install', '--user', '--no-warn-script-location', this.pkgName],
        Object.assign({
          'PIP_DISABLE_PIP_VERSION_CHECK': '1',
          'PYTHONUSERBASE': pythonUserBase
        }, this.env));
    } else {
      console.log(green('     => ') + cyan('pip install %s'), this.pkgName);
      await this._exec(['pip', 'install', this.pkgName]);
    }
  }
}

class AptTask extends InstallTask {

  constructor(name, runtime, codeUri, pkgName, local, target, env, context, verbose) {
    super(name, runtime, codeUri, pkgName, local, target, env, context, verbose);
    this.cacheDir = '/code/.fun/tmp/install';
  }

  async beforeRun() {
    await super.beforeRun();
    await this.runner.exec(['bash', '-c', `mkdir -p ${this.cacheDir}`]);
  }

  async afterRun() {
    await this.runner.exec(['bash', '-c', `rm -rf ${this.cacheDir}`]);
    await super.afterRun();
  }

  async doRun() {
    await super.doRun();
    await this.update();

    if (this.local) {
      await this.dlPkg(this.pkgName);
      await this.instDeb();
      await this.cleanup();
    } else {
      console.log(green('     => ') + cyan('apt-get install -y %s'), this.pkgName);
      await this._exec(['apt-get', 'install', '-y', this.pkgName]);
    }
  }

  async update() {
    console.log(green('     => ') + cyan('apt-get update (if need)'));
    await this._exec(['bash', '-c',
      `if [ -z "$(find /var/cache/apt/pkgcache.bin -mmin -60 2>/dev/null)" ]; then
        apt-get update; touch /var/cache/apt/pkgcache.bin; 
      fi`
    ]);
  }

  async dlPkg(pkgName) {
    console.log(green('     => ') + cyan('apt-get install -y -d -o=dir::cache=%s %s --reinstall'), this.cacheDir, pkgName);

    await this._exec(['apt-get', 'install', '-y', '-d', `-o=dir::cache=${this.cacheDir}`, pkgName, '--reinstall']);
  }

  async instDeb() {
    const instDir = this.target || '/code/.fun/root';
    console.log(green('     => ') + cyan(`bash -c 
        for f in $(ls %s/archives/*.deb); do
          echo "Preparing to unpack \${f##*/}"
          dpkg -x $f %s; 

          echo "Setting up \${f##*/}"
          mkdir -p %s/deb-control/\${f%.*}; 
          dpkg -e $f %s/deb-control/\${f%.*}; 
          if [ -f "%s/deb-control/\${f%.*}/postinst" ]; then 
            FUN_INSTALL_LOCAL=true DPKG_MAINTSCRIPT_NAME=postinst %s/deb-control/\${f%.*}/postinst configure;
          fi; 
        done;`), this.cacheDir, instDir, this.cacheDir, this.cacheDir, this.cacheDir, this.cacheDir);

    await this._exec(['bash', '-c', '-O', 'nullglob',
      `for f in ${this.cacheDir}/archives/*.deb; do 
          echo "Preparing to unpack \${f##*/}"
          dpkg -x $f ${instDir}; 

          echo "Setting up \${f##*/}"
          mkdir -p ${this.cacheDir}/deb-control/\${f%.*}; 
          dpkg -e $f ${this.cacheDir}/deb-control/\${f%.*};
          if [ -f "${this.cacheDir}/deb-control/\${f%.*}/postinst" ]; then 
            FUN_INSTALL_LOCAL=true DPKG_MAINTSCRIPT_NAME=postinst ${this.cacheDir}/deb-control/\${f%.*}/postinst configure; 
          fi; 
      done;`
    ]);
  }

  async cleanup() {
    console.log(green('     => ') + cyan('bash -c \'rm -rf %s/archives\''), this.cacheDir);
    await this._exec(['bash', '-c', `rm -rf ${this.cacheDir}/archives`]);
  }
}

class ShellTask extends Task {
  constructor(name, runtime, codeUri, script, cwd = '', env, context, verbose) {
    super(name, runtime, codeUri, env, context, verbose);
    this.script = script;
    this.cwd = cwd;
  }

  async doRun() {
    await super.doRun();
    console.log(green('     => ') + cyan('bash -c  \'%s\''), this.script);
    if (this.cwd) {
      console.log(green('        ') + cyan('cwd: %s'), this.cwd);
    }

    await this.runner.exec(['bash', '-c', this.script], {
      cwd: this.cwd,
      env: this.env,
      verbose: this.verbose
    });
  }
}

module.exports = {
  Task, InstallTask, PipTask, AptTask, ShellTask
};
