// require modules
'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');

const debug = require('debug')('fun:zip');
const JSZip = require('jszip');
const glob = require('glob');

const exists = util.promisify(fs.exists);
const readdir = util.promisify(fs.readdir);
const lstat = util.promisify(fs.lstat);

const buildDeps = require('./deps');
const readlink = util.promisify(fs.readlink);
const zipIgnored = ['.git', '.svn', '.env'];

function globAsync(pattern, cwd) {
  return new Promise((resolve, reject) => {
    glob(pattern, {
      cwd
    }, (err, list) => {
      if (err) {
        return reject(err);
      }
      resolve(list);
    });
  });
}

function permStr(mode) {
  return (mode & 0o777).toString(8);
}

exports.compress = async function (func, rootDir, type) {
  const deps = await buildDeps(func, rootDir, type);

  const zip = new JSZip();
  if (deps) {
    debug('load deps zip');
    zip.loadAsync(deps, {
      base64: true
    });
  }

  debug('append files: %s', func.codes.join(','));

  var jobs = [];
  const list = new Set(func.codes);
  for (var item of list) {
    jobs.push(globAsync(item, rootDir));
  }

  const results = await Promise.all(jobs);
  for (let list of results) {
    for (let filename of list) {
      const filepath = path.join(rootDir, filename);
      const stats = await lstat(filepath);
      if (stats.isFile()) {
        zip.file(filename, fs.createReadStream(filepath), {
          unixPermissions: permStr(stats.mode)
        });
      } else if (stats.isSymbolicLink()) {
        // see https://github.com/Stuk/jszip/issues/428
        zip.file(filename, await readlink(filepath), {
          unixPermissions: '120' + permStr(stats.mode)
        });
      }
    }
  }

  return zip.generateAsync({type: 'base64', platform: 'UNIX'});
};

async function zipFolder(zip, folder, folders) {
  folders.push(folder);
  const dir = path.join(...folders);
  await Promise.all((await readdir(dir)).map(async (f) => {
    const fPath = path.join(dir, f);
    const s = await lstat(fPath);

    if (zipIgnored.includes(f)) {
      return ;
    }

    if (s.isFile()) {
      zip.file(f, fs.createReadStream(fPath), {
        unixPermissions: permStr(s.mode)
      });
    } else if (s.isDirectory()) {
      const zFolder = zip.folder(f);
      await zipFolder(zFolder, f, folders.slice());
    } else if (s.isSymbolicLink()){
      // see https://github.com/Stuk/jszip/issues/428
      zip.file(f, await readlink(fPath), {
        unixPermissions: '120' + permStr(s.mode)
      });
    }  
  }));
}

exports.file = async function (file) {
  if (!(await exists(file))) {
    console.error('zip file %s is not exist.', file);
    process.exit(-1);
  }

  const zip = new JSZip();
  const stats = await lstat(file);
  if (stats.isFile()) {
    debug('append file: %s', file)
    zip.file(path.basename(file), fs.createReadStream(file));
  } else if (stats.isDirectory()) {
    debug('append folder: %s', file)
    await zipFolder(zip, file, []);
  } else {
    console.error('file %s must be a regular file or directory.', file);
    process.exit(-1);
  }

  return zip.generateAsync({
    type: 'base64',
    platform:'UNIX',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9
    }
  });
};
