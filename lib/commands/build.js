'use strict';

const getConf = require('../conf');
const buildDeps = require('../deps');

const rootDir = process.cwd();

async function build() {
  const conf = await getConf(rootDir);

  const services = conf['function-compute'].services;
  for (var i = 0; i < services.length; i++) {
    const item = services[i];
    const functions = item.functions;
    for (var j = 0; j < functions.length; j++) {
      const func = functions[j];
      await buildDeps(func, rootDir, 'remote');
    }
  }
}

module.exports = build;
