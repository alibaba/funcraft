'use strict';

const util = require('util');
const path = require('path');
const fs = require('fs');
const os = require('os');
const execSync = require('child_process').execSync;

const httpx = require('httpx');
const kitx = require('kitx');

const exists = util.promisify(fs.exists);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

const debug = require('debug')('fun:deps');
const archiver = require('archiver');

function read(readable, encoding) {
  return new Promise((resolve, reject) => {
    var onData, onError, onEnd;

    var cleanup = function () {
      // cleanup
      readable.removeListener('error', onError);
      readable.removeListener('data', onData);
      readable.removeListener('end', onEnd);
    };

    const bufs = [];
    var size = 0;

    onData = function (buf) {
      bufs.push(buf);
      size += buf.length;
    };

    onError = function (err) {
      cleanup();
      reject(err);
    };

    onEnd = function () {
      cleanup();
      var buff = Buffer.concat(bufs, size);

      if (encoding) {
        const result = buff.toString(encoding);
        return resolve(result);
      }

      resolve(buff);
    };

    readable.on('error', onError);
    readable.on('data', onData);
    readable.on('end', onEnd);
  });
}

const zip = function (rootDir) {
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  });

  // good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on('warning', function(err) {
    console.log(err);
    if (err.code === 'ENOENT') {
      // log warning
    } else {
      // throw error
      throw err;
    }
  });

  archive.on('error', (e) => console.log(e));

  if (debug.enabled) {
    archive.on('entry', function (entry) {
      debug('entry: %j', entry);
    });

    archive.on('progress', (p) => {
      console.log('progress');
      debug('progress: %j', p);
    });
  }

  archive.glob('node_modules/**', {
    cwd: rootDir
  });
  archive.finalize();

  return read(archive, 'base64');
};

function pkg(deps) {
  return `{
  "dependencies": ${JSON.stringify(deps)}
}`;
}

async function localBuild(data) {
  const runtime = data.runtime;
  const deps = pkg(data.dependencies);
  const digest = kitx.md5(`${runtime}:${deps}`, 'hex');
  var dir = `${os.tmpdir()}/${digest}`;
  try {
    fs.mkdirSync(dir);
  } catch (ex) {
    // ignore error
  }

  const pkgPath = path.join(dir, 'package.json');
  fs.writeFileSync(pkgPath, deps);
  execSync('npm i --registry=https://registry.npm.taobao.org', {
    cwd: dir
  });

  return zip(dir);
}

async function remoteBuild(data) {
  const url = `http://59766a59fa0b4391b703b51d97230296-cn-hangzhou.alicloudapi.com/build/${data.runtime}`;

  const response = await httpx.request(url, {
    method: 'POST',
    timeout: 60000,
    headers: {
      'content-type': 'application/json'
    },
    data: JSON.stringify(data)
  });

  debug('%j', data);

  const statusCode = response.statusCode;

  var body = await httpx.read(response, 'utf8');
  const headers = response.headers;
  const contentType = headers['content-type'] || '';

  if (contentType.startsWith('application/json')) {
    body = JSON.parse(body);
  }

  if (statusCode !== 200) {
    debug(response.headers);
    debug('statusCode: %s', statusCode);
    debug('build dependencies failed!');
    let err = new Error(`${headers['x-ca-error-message']},` +
      ` requestid: ${headers['x-ca-request-id']}`);
    err.name = 'BuildError';
    err.data = data;
    throw err;
  }

  if (!body.ok) {
    let err = new Error(`Build failed, ${body.message}`);
    err.name = 'BuildError';
    err.data = data;
    throw err;
  }

  return body.data.zip;
}

async function buildDeps(func, rootDir, type) {
  const runtime = (func.runtime || 'nodejs4.4').replace('.', '_');

  const buildType = type || process.env.BUILD_TYPE || 'remote';
  if (buildType !== 'local' && buildType !== 'remote') {
    throw new TypeError(`BUILD_TYPE must be 'local' or 'remote'.`);
  }

  // read package.json
  const pkgPath = path.join(rootDir, 'package.json');
  const hasPackageFile = await exists(pkgPath);
  if (!hasPackageFile) {
    debug('The package.json inexists in Project, skipped.');
    return;
  }

  const pkg = require(pkgPath);
  const dependencies = pkg.dependencies || {};
  if (Object.keys(dependencies).length === 0) {
    debug('The package.json has not any dependencies in Project, skipped.');
    return;
  }

  const data = {
    runtime: runtime,
    dependencies: dependencies
  };

  const stringToHash = `${runtime}:${JSON.stringify(dependencies)}`;

  const hash = kitx.md5(stringToHash, 'hex');
  const zipPath = path.join(rootDir, `node_modules_${hash}.zip`);
  const md5Path = path.join(rootDir, `node_modules_${hash}.zip.md5`);
  const hasZip = await exists(zipPath);
  const hasSign = await exists(md5Path);

  if (hasZip && hasSign) {
    const zip = await readFile(zipPath, 'base64');
    const sign = await readFile(md5Path, 'utf8');
    if (sign === kitx.md5(zip, 'hex')) {
      debug('The node_modules pre-compressed, skipped.');
      return zip;
    }
  }

  var base64;

  if (buildType === 'remote') {
    debug('build deps remotely.');
    base64 = await remoteBuild(data);
  } else {
    debug('build deps locally.');
    base64 = await localBuild(data);
  }

  debug('build %j completed.', func);
  const digest = kitx.md5(base64, 'hex');
  await writeFile(zipPath, base64, 'base64');
  await writeFile(md5Path, digest);

  return base64;
}

module.exports = { buildDeps, read };
