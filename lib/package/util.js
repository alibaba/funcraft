'use strict';

const fs = require('fs-extra');
const crypto = require('crypto');

function md5(path) {
  return new Promise((resolve, reject) => {
    const md5 = crypto.createHash('md5');

    const readStream = fs.createReadStream(path);
    readStream.on('data', (data) => {
      md5.update(data);
    });

    readStream.on('end', () => {
      resolve(md5.digest('hex'));
    });
  });
}

module.exports = {
  md5
};