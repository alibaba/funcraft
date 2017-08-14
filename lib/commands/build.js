'use strict';

const util = require('util');
const path = require('path');
const fs = require('fs');

const httpx = require('httpx');

const getConf = require('../conf');

const exists = util.promisify(fs.exists);
const rootDir = process.cwd();

async function makeDeps(func) {
  const runtime = (func.runtime || 'nodejs4.4').replace('.', '_');

  // read package.json
  const pkgPath = path.join(rootDir, 'package.json');
  const hasPackageFile = await exists(pkgPath);
  if (!hasPackageFile) {
    console.log('The package.json inexists in Project.');
    console.log('Skipped');
    return;
  }

  const pkg = require(pkgPath);
  const dependencies = pkg.dependencies || {};
  if (Object.keys(dependencies).length === 0) {
    console.log('The package.json has not any dependencies in Project.');
    console.log('Skipped');
    return;
  }

  const url = `http://59766a59fa0b4391b703b51d97230296-cn-hangzhou.alicloudapi.com/build/${runtime}`;

  console.log(JSON.stringify({
      runtime: runtime,
      dependencies: dependencies
    }));
  console.log(url);
  const response = await httpx.request(url, {
    method: 'POST',
    timeout: 60000,
    data: JSON.stringify({
      runtime: runtime,
      dependencies: dependencies
    })
  });

  // const statusCode = response.statusCode;
  var body = await httpx.read(response, 'utf8');
  const contentType = response.headers['content-type'] || '';

  if (contentType.startsWith('application/json')) {
    body = JSON.parse(body);
  }
  console.log(body);
}

async function build() {
  const conf = await getConf(rootDir);

  const services = conf['function-compute'].services;
  for (var i = 0; i < services.length; i++) {
    const item = services[i];
    const functions = item.functions;
    for (var j = 0; j < functions.length; j++) {
      const func = functions[j];
      await makeDeps(func);
    }
  }
}

module.exports = build;
