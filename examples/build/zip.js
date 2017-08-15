// require modules
'use strict';

const debug = require('debug')('fun:zip');
const archiver = require('archiver');

function read(readable, encoding) {
  return new Promise((resolve, reject) => {
    var onData, onError, onEnd;

    var cleanup = function () {
      // cleanup
      readable.removeListener('error', onError);
      readable.removeListener('data', onData);
      readable.removeListener('end', onEnd);
    };

    const bufs = [];
    var size = 0;

    onData = function (buf) {
      bufs.push(buf);
      size += buf.length;
    };

    onError = function (err) {
      cleanup();
      reject(err);
    };

    onEnd = function () {
      cleanup();
      var buff = Buffer.concat(bufs, size);

      if (encoding) {
        const result = buff.toString(encoding);
        return resolve(result);
      }

      resolve(buff);
    };

    readable.on('error', onError);
    readable.on('data', onData);
    readable.on('end', onEnd);
  });
}

module.exports = function (rootDir) {
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  });

  // good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on('warning', function(err) {
    console.log(err);
    if (err.code === 'ENOENT') {
      // log warning
    } else {
      // throw error
      throw err;
    }
  });

  archive.on('error', (e) => console.log(e));

  if (debug.enabled) {
    archive.on('entry', function (entry) {
      debug('entry: %j', entry);
    });

    archive.on('progress', (p) => {
      console.log('progress');
      debug('progress: %j', p);
    });
  }

  archive.glob('node_modules/**', {
    cwd: rootDir
  });
  archive.finalize();

  return read(archive, 'base64');
};
