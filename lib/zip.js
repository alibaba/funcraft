// require modules
'use strict';

const fs = require('fs');
const path = require('path');

const debug = require('debug')('fun:zip');
const JSZip = require('jszip');
const glob = require('glob');

const buildDeps = require('./deps');

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
  results.forEach((list) => {
    list.forEach((filename) => {
      const filepath = path.join(rootDir, filename);
      zip.file(filename, fs.createReadStream(filepath));
    });
  });

  return zip.generateAsync({type: 'base64'});
};
