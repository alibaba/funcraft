'use strict';

const getProfile = require('./profile').getProfile;
const retry = require('promise-retry');

async function getRetryOptions() {
  const profile = await getProfile();
  const retryOptions = {
    retries: profile.retries,
    factor: 2,
    minTimeout: 1 * 1000,
    randomize: true
  };

  return retryOptions;
}

async function promiseRetry(fn) {
  const retryOptions = await getRetryOptions();
  return retry(fn, retryOptions);
}

module.exports = promiseRetry;