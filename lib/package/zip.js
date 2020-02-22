// require modules
'use strict';

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const debug = require('debug')('fun:zip');
const JSZip = require('jszip');
const archiver = require('archiver');

const { readLines } = require('../utils/file');
const { green, grey } = require('colors');
const { generateRandomZipPath } = require('../utils/path');
const { buildDeps } = require('../deps');
const { createProgressBar } = require('../import/utils');

const _ = require('lodash');

const isWindows = process.platform === 'win32';

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

async function compress(func, rootDir, type) {
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
      const stats = await fs.lstat(filepath);
      if (stats.isFile()) {
        zip.file(filename, fs.createReadStream(filepath), {
          unixPermissions: permStr(stats.mode)
        });
      } else if (stats.isSymbolicLink()) {
        // see https://github.com/Stuk/jszip/issues/428
        zip.file(filename, await fs.readlink(filepath), {
          unixPermissions: '120' + permStr(stats.mode)
        });
      }
    }
  }

  return zip.generateAsync({ type: 'base64', platform: 'UNIX' });
}

function isBootstrapPath(absFilePath, absCodeUri, isFile = true) {
  let absBootstrapDir;
  if (isFile) {
    absBootstrapDir = path.dirname(absCodeUri);
  } else {
    absBootstrapDir = absCodeUri;
  }
  return path.join(absBootstrapDir, 'bootstrap') === absFilePath;
}

async function zipFolder(zipArchiver, folder, folders, funignore, codeUri, prefix = '') {
  folders.push(folder);
  const dir = path.join(...folders);

  return (await Promise.all((await fs.readdir(dir)).map(async (f) => {

    const fPath = path.join(dir, f);

    debug('before zip: lstat fPath: %s, absolute fPath is %s', fPath, path.resolve(fPath));

    let s;

    try {
      s = await fs.lstat(fPath);
    } catch (error) {
      debug(`before zip: could not found fPath ${fPath}, absolute fPath is ${path.resolve(fPath)}, exception is ${error}, skiping`);
      return 0;
    }

    if (funignore && funignore(fPath)) {
      debug('file %s is ignored.', fPath);
      return 0;
    }

    const absFilePath = path.resolve(fPath);
    const absCodeUri = path.resolve(codeUri);
    const relative = path.relative(absCodeUri, absFilePath);

    const isBootstrap = isBootstrapPath(absFilePath, absCodeUri, false);
    if (s.size === 1067) {
      const content = await readLines(fPath);
      if (_.head(content) === 'XSym' && content.length === 5) {
        const target = content[3];
        zipArchiver.symlink(relative, target, {
          mode: (isBootstrap || isWindows) ? s.mode | 73 : s.mode
        });
        return 1;
      }
    }

    if (s.isFile() || s.isSymbolicLink()) {
      zipArchiver.file(fPath, {
        name: relative,
        prefix,
        mode: (isBootstrap || isWindows) ? s.mode | 73 : s.mode,
        stats: s // The archiver uses fs.stat by default, and pasing the result of lstat to ensure that the symbolic link is properly packaged
      });

      return 1;
    } else if (s.isDirectory()) {
      return await zipFolder(zipArchiver, f, folders.slice(), funignore, codeUri, prefix);
    }
    console.error(`ignore file ${absFilePath}, because it isn't a file, symbolic link or directory`);
    return 0;

  }))).reduce(((sum, curr) => sum + curr), 0);
}

async function generateAsync(zip) {
  return await zip.generateAsync({
    type: 'base64',
    platform: 'UNIX',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9
    }
  });
}

async function packFromJson(files) {
  const zip = new JSZip();

  _.forEach(files, (content, path) => {
    zip.file(path, content);
  });

  return await generateAsync(zip);
}

async function packTo(file, funignore, targetPath, prefix = '') {
  if (!(await fs.pathExists(file))) {
    throw new Error(`zip file ${file} is not exist.`);
  }

  debug('pack file file is %s, absFilePath is %s', file, path.resolve(file));

  const stats = await fs.lstat(file);

  if (funignore && funignore(file)) {
    throw new Error(`file ${file} is ignored.`);
  }

  debug(`append ${stats.isFile() ? 'file' : 'folder'}: ${file}, absolute path is ${path.resolve(file)}`);

  const bar = createProgressBar(`${green(':zipping')} :bar :current/:total :rate files/s, :percent :etas`, { total: 0 });

  const output = fs.createWriteStream(targetPath);
  const zipArchiver = archiver('zip', {
    zlib: {
      level: 6
    }
  }).on('progress', (progress) => {
    bar.total = progress.entries.total;
    bar.tick({
      total: progress.entries.processed
    });
  }).on('warning', (err) => {
    console.warn(err);
  }).on('error', (err) => {
    console.error(`    ${green('x')} ${targetPath} - ${grey('zip error')}`);
    throw err;
  });

  // copied from https://github.com/archiverjs/node-archiver/blob/master/lib/core.js#L834-L877
  // but add mode support
  zipArchiver.symlink = function(filepath, target, { mode }) {
    var data = {};
    data.type = 'symlink';
    data.name = filepath.replace(/\\/g, '/');
    data.linkname = target.replace(/\\/g, '/');
    data.sourceType = 'buffer';

    if (mode) {
      data.mode = mode;
    }

    this._entriesCount++;
    this._queue.push({
      data: data,
      source: new Buffer(0)
    });

    return this;
  };

  let count;

  zipArchiver.pipe(output);

  const asbFilePath = path.resolve(file);
  const isBootstrap = isBootstrapPath(asbFilePath, asbFilePath, true);

  if (stats.isFile()) {
    zipArchiver.file(asbFilePath, {
      name: path.basename(file),
      prefix,
      mode: (isBootstrap || isWindows) ? stats.mode | 73 : stats.mode // add execution permission, the binary of 73 is 001001001
    });

    count = 1;
  } else if (stats.isDirectory()) {
    count = await zipFolder(zipArchiver, file, [], funignore, file, prefix);
  } else {
    throw new Error('file %s must be a regular file or directory.', file);
  }

  return await new Promise((resolve, reject) => {
    output.on('close', () => {
      const compressedSize = zipArchiver.pointer();
      resolve({ count, compressedSize });
    });

    try {
      zipArchiver.finalize();
    } catch (err) {
      reject(err);
    }
  });
}

async function pack(file, funignore) {

  const { randomDir, zipPath } = await generateRandomZipPath();

  const { count, compressedSize } = await packTo(file, funignore, zipPath);

  const base64 = fs.readFileSync(zipPath, { encoding: 'base64' });

  await fs.remove(randomDir);

  return {
    base64,
    count,
    compressedSize
  };
}

module.exports = {
  pack, packTo, packFromJson, compress
};