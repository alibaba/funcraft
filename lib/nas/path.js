'use strict';

const path = require('path');

function parseNasPath(nasPath) {
  var prefix = 'nas://';

  if (nasPath.indexOf(prefix) !== 0) {
    throw new Error('nas path err: ' + nasPath);
  }
  var mid = nasPath.substr(prefix.length);

  const split = ':/';
  const idx = mid.indexOf(split);

  if (idx === -1) {
    throw new Error('nas path err: ' + nasPath);
  }

  var resolvedNasPath = path.join('/', mid.substr(idx + split.length));
  var service = mid.substr(0, idx);

  var res = {
    nasPath: resolvedNasPath,
    serviceName: service
  };

  return res;
}

module.exports = {
  parseNasPath
};