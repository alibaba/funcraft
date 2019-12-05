
'use strict';

const fs = require('fs-extra');
const path = require('path');

const { red } = require('colors');
const { detectTmpDir } = require('../tpl');

async function ensureTmpDir(tmpDir, tplPath, serviceName, functionName) {

  const absTmpDir = tmpDir ? path.resolve(tmpDir) : path.resolve(detectTmpDir(tplPath), serviceName, functionName);

  if (await fs.pathExists(absTmpDir)) {

    const stats = await fs.lstat(absTmpDir);

    if (stats.isFile()) {
      throw new Error(red(`'${absTmpDir}' should be a directory.`));
    }
  } else {
    await fs.ensureDir(absTmpDir, {
      mode: parseInt('0777', 8)
    });
  }

  return absTmpDir;
}

module.exports = ensureTmpDir;