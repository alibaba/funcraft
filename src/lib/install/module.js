'use strict';

const yaml = require('js-yaml');
const fs = require('fs-extra');
const debug = require('debug')('fun:install');
const { red } = require('colors');
const _ = require('lodash');

class FunTask {

  constructor(type, attrs) {
    this.type = type;
    this.attrs = attrs;
  }

  static parse(attrs) {
    if (attrs.pip) {
      return new FunTask('pip', Object.assign({ local: true }, attrs));
    } else if (attrs.apt) {
      return new FunTask('apt', Object.assign({ local: true }, attrs));
    } else if (attrs.shell) {
      return new FunTask('shell', attrs);
    }
    throw new Error('Unknown task.');
  }

  isEqual(task) {
    if (!(task instanceof FunTask)) { return false; }
    if (this.type !== task.type) { return false; }
    return this.attrs[this.type] === task.attrs[this.type];
  }

  canonical() {
    let attrs = _(this.attrs)
      .toPairs()
      .reject(item => {
        switch (item[0]) {
        case 'local': return item[1] === true;
        case 'env': return _.isEmpty(item[1]);
        default: return false;
        }
      })
      .fromPairs()
      .value();

    return new FunTask(this.type, attrs);
  }
}
class FunModule {
  constructor(runtime) {
    this.runtime = runtime;
    this.tasks = [];
    this.modules = [];
  }

  addTask(task) {
    for (var i = 0; i < this.tasks.length; i++) {
      if (this.tasks[i].isEqual(task)) {
        this.tasks[i] = task;
        return;
      }
    }
    this.tasks.push(task);
  }

  addModule(moduleName) {
    if (this.modules.includes(moduleName)) {
      debug(`Module ${moduleName} is already in list.`);
      return;
    }
    this.modules.push(moduleName);
  }

  static load(file) {
    var doc = yaml.safeLoad(fs.readFileSync(file, 'utf8'));
    if (!doc.runtime) {
      throw new Error(red('fun.yml must have a \'runtime\'.'));
    }
    const funModule = new FunModule(doc.runtime);

    if (doc.modules) {
      if (!Array.isArray(doc.modules)) {
        throw new Error('modules must be a array.');
      }
      doc.modules.forEach((m) => {
        funModule.addModule(m);
      });
    }

    if (doc.tasks) {
      if (!Array.isArray(doc.tasks)) {
        throw new Error('tasks must be a array.');
      }
      doc.tasks.forEach((t) => {
        if (t instanceof Object) {
          funModule.addTask(FunTask.parse(t));
        } else {
          throw new Error('task must be a object.');
        }
      });
    }
    return funModule;
  }

  static store(file, funModule) {
    const doc = {
      runtime: funModule.runtime
    };

    if (funModule.modules.length > 0) {
      doc.modules = funModule.modules;
    }

    if (funModule.tasks) {
      doc.tasks = [];
      funModule.tasks.forEach((t) => {
        doc.tasks.push(t.canonical().attrs);
      });
    }
    fs.writeFileSync(file, yaml.safeDump(doc));
  }
}



module.exports = {
  FunModule,
  FunTask
};