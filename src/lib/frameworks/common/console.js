'use strict';

const fs = require('fs-extra');
const path = require('path');

function isFcConsoleApplication() {
  return process.env.FUN_CONSOLE_ENV
    && process.env.FUN_CONSOLE_ENV !== '0'
    && process.env.FUN_CONSOLE_ENV !== 'false';
}

async function writePortFileForFcConsoleApplication(codeDir) {
  await fs.writeFile(path.join(codeDir, '.PORT'), '');
}

module.exports = {
  writePortFileForFcConsoleApplication,
  isFcConsoleApplication
};