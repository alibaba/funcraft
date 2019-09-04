'use strict';
const fs = require('fs-extra');
const mkdirp = require('mkdirp-promise');

async function makeTmpDir(tmpDir) {
  let stats;
  let error;
  try {
    stats = await fs.lstat(tmpDir);   
  } catch (err) {
    error = err;
  }
  if (error || (!error && stats.isFile())) {
    await mkdirp(tmpDir);
    await fs.chmod(tmpDir, 0o1777);
  }
}

module.exports = {
  makeTmpDir
};