'use strict';

var semver = require('semver');
var pkg = require('../package');

var version = pkg.engines.node;
if (!semver.satisfies(process.version, version)) {
  throw new Error(`\x1b[31m@alicloud/fun required node version ${version} not satisfied with current version ${process.version}.\x1b[0m\n`);
}
