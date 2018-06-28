
var semver = require('semver');
var package = require('../package');


var version = package.engines.node;
if (!semver.satisfies(process.version, version)) {
  console.error(`\x1b[31m@alicloud/fun required node version ${version} not satisfied with current version ${process.version}.\x1b[0m\n`);
  process.exit(1);
}
