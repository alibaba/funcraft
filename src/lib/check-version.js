'use strict';

var tryRequire = require('try-require');
var pkg = tryRequire('../../package') || tryRequire('../package');
var semver = require('semver');

var version = pkg.engines.node;
if (!semver.satisfies(process.version, version)) {
  throw new Error(`\x1b[31m@alicloud/fun required node version ${version} not satisfied with current version ${process.version}.\x1b[0m\n`);
}
