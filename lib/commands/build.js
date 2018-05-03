'use strict';

const getConf = require('../conf');
const buildDeps = require('../deps');

async function build(argv) {
  const { conf, dir } = await getConf(argv);
  const services = conf['function-compute'].services;
  for (var i = 0; i < services.length; i++) {
    const item = services[i];
    const functions = item.functions;
    for (var j = 0; j < functions.length; j++) {
      const func = functions[j];
      await buildDeps(func, dir);
    }
  }
}

module.exports = build;
