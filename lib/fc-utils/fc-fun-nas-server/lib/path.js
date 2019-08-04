'use strict';

const path = require('path');
const fs = require('fs-extra');

async function readTmpDir(tmpDir) {
  const files = await fs.readdir(tmpDir);

  return files.map((file) => {
    return path.join(tmpDir, file);
  });
}

module.exports = { readTmpDir };