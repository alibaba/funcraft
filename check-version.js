
var semver = require('semver');
var package = require('./package');

exports.checkVersion = function() {
  var version = package.engines.node;
  if (!semver.satisfies(process.version, version)) {
    console.log(`Required node version ${version} not satisfied with current version ${process.version}.`);
    process.exit(1);
  }
}