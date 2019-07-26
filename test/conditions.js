'use strict';

const hasDocker = process.env.TRAVIS_OS_NAME !== 'osx' && process.env.TRAVIS_OS_NAME !== 'windows';

module.exports = {
  hasDocker
};