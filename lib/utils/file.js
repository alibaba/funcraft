'use strict';

const fs = require('fs-extra');
const readline = require('readline');

function readLines(fileName) {
  return new Promise((resolve, reject) => {
    const lines = [];

    readline.createInterface({input: fs.createReadStream(fileName)})
      .on('line', line => lines.push(line))
      .on('close', () => resolve(lines))
      .on('error', reject);
  });
}

module.exports = { readLines };