'use strict';

const { AptTask, PipTask, ShellTask } = require('./task');
const Context = require('./context');
const { FunModule } = require('./module');
const path = require('path');

async function installPackage(runtime, pkgType, pkgName, options) {

  const ctx = await new Context(runtime, options.codeUri);

  try {
    switch (pkgType) {

    case 'apt':
      await new AptTask(options.name, runtime, options.codeUri, 
        pkgName, options.local, options.env, ctx, options.verbose).run();
      break;
    case 'pip':
      await new PipTask(options.name, runtime, options.codeUri, 
        pkgName, options.local, options.env, ctx, options.verbose).run();
      break;
    case 'module':
      // TODO
      break;
    default:
      throw new Error(`unknow package type %${options.packageType}`);
    }
  } finally {
    await ctx.teardown();
  }

}

async function installFromYaml(file, verbose) {

  const funModule = FunModule.load(file);
  const runtime = funModule.runtime;
  const codeUri = path.dirname(file);
  const ctx = await new Context(runtime, codeUri);

  try {
    for (const t of funModule.tasks) {


      if (t.type === 'pip') {
        const pipTask = new PipTask(t.attrs.name, runtime, codeUri, 
          t.attrs.pip, t.attrs.local, t.attrs.env,  ctx, verbose);
        await pipTask.run();
      } else if (t.type === 'apt') {
        const aptTask = new AptTask(t.attrs.name, runtime, codeUri, 
          t.attrs.apt, t.attrs.local, t.attrs.env, ctx, verbose);
        await aptTask.run();
      } else if (t.type === 'shell') {
        const shellTask = new ShellTask(t.attrs.name, runtime, codeUri, 
          t.attrs.shell, t.attrs.cwd, t.attrs.env, ctx, verbose);
        await shellTask.run();
      } else {
        console.error('unkown task %s', t);
      }
    }
  } finally {
    await ctx.teardown();
  }

}


module.exports = {
  installFromYaml,
  installPackage
};