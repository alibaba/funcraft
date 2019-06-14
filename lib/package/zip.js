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

const buildDeps = require('../deps');
const readlink = util.promisify(fs.readlink);

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

async function zipFolder(zip, folder, folders, funignore) {
  folders.push(folder);
  const dir = path.join(...folders);

  let count = 0;
  
  await Promise.all((await readdir(dir)).map(async (f) => {

    const fPath = path.join(dir, f);

    debug('before zip: lstat fPath: %s, absolute fPath is %s', fPath, path.resolve(fPath));

    let s;

    try {
      s = await lstat(fPath);
    } catch (error) {
      debug(`before zip: could not found fPath ${fPath}, absolute fPath is ${path.resolve(fPath)}, exception is ${error}, skiping`);
      return;
    }

    if (funignore && funignore(fPath)) {
      debug('file %s is ignored.', fPath);
      return;
    }

    if (s.isFile()) {
      count++;
      zip.file(f, fs.createReadStream(fPath), {
        unixPermissions: permStr(s.mode)
      });
    } else if (s.isDirectory()) {
      const zFolder = zip.folder(f);
      let folderFilesCount = await zipFolder(zFolder, f, folders.slice(), funignore);
      count += folderFilesCount;
    } else if (s.isSymbolicLink()) {
      // see https://github.com/Stuk/jszip/issues/428
      zip.file(f, await readlink(fPath), {
        unixPermissions: '120' + permStr(s.mode)
      });
    }  
  }));
  return count;
}

exports.pack = async function (file, funignore) {
  if (!(await exists(file))) {
    throw new Error('zip file %s is not exist.', file);
  }

  const zip = new JSZip();

  debug('pack file file is %s, absFilePath is %s', file, path.resolve(file));
  
  const stats = await lstat(file);

  if (funignore && funignore(file)) {
    throw new Error('file %s is ignored.', file);
  }

  let count = 0;

  if (stats.isFile()) {
    debug('append file: %s', file);
    zip.file(path.basename(file), fs.createReadStream(file));
    count++;
  } else if (stats.isDirectory()) {
    debug('append folder: %s, absolute path is %s', file, path.resolve(file));
    count = await zipFolder(zip, file, [], funignore);
  } else {
    throw new Error('file %s must be a regular file or directory.', file);
  }
  const base64 = await zip.generateAsync({
    type: 'base64',
    platform: 'UNIX',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9
    }
  });

  return { base64, count };
};
