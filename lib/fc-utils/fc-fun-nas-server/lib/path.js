'use strict';

const path = require('path');
const fs = require('fs-extra');

async function readTmpDir(tmpDir) {
  const files = await fs.readdir(tmpDir);

  return files.map((file) => {
    return path.join(tmpDir, file);
  });
}
function mapToObj(map) {
  let obj= Object.create(null);
  for (let [k, v] of map) {
    obj[k] = v;
  }
  return obj;
}

function mapToJson(map) {
  return JSON.stringify(mapToObj(map));
}

module.exports = { readTmpDir, mapToJson };