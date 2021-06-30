
const { getProfile } = require('./profile');
const { getFcClient } = require('./client');
const _ = require('lodash');


async function makeDestination(serviceName, functionName, asyncConfiguration, qualifier = 'LATEST') {
  const { accountId, defaultRegion } = await getProfile();
  const { OnSuccess, OnFailure } = asyncConfiguration.Destination || {};

  const destinationConfig = {};
  if (OnSuccess) {
    destinationConfig.onSuccess = {
      destination: OnSuccess.replace(':::', `:${defaultRegion}:${accountId}:`)
    };
  }
  if (OnFailure) {
    destinationConfig.onFailure = {
      destination: OnFailure.replace(':::', `:${defaultRegion}:${accountId}:`)
    };
  }

  const asyncConfig = {
    maxAsyncRetryAttempts: asyncConfiguration.MaxAsyncRetryAttempts,
    maxAsyncEventAgeInSeconds: asyncConfiguration.MaxAsyncEventAgeInSeconds,
    statefulInvocation: asyncConfiguration.StatefulInvocation,
    destinationConfig
  };

  let hasAsyncConfig = false;
  const fcClient = await getFcClient();
  try {
    const { data } = await fcClient.getFunctionAsyncConfig(serviceName, functionName, qualifier);
    const asyncConfigCache = {
      destinationConfig: data.destinationConfig,
      maxAsyncEventAgeInSeconds: data.maxAsyncEventAgeInSeconds,
      statefulInvocation: data.statefulInvocation,
      maxAsyncRetryAttempts: data.maxAsyncRetryAttempts
    };
    if (_.isEqual(asyncConfig, asyncConfigCache)) {
      return;
    }
    hasAsyncConfig = true;
  } catch (ex) {
    if (ex.code !== 'AsyncConfigNotExists') {
      throw ex;
    }
  }

  if (hasAsyncConfig) {
    try {
      await fcClient.deleteFunctionAsyncConfig(serviceName, functionName, qualifier);
    } catch (ex) {
      throw ex;
    }
  }

  try {
    await fcClient.putFunctionAsyncConfig(serviceName, functionName, qualifier, asyncConfig);
  } catch (ex) {
    throw ex;
  }
}

module.exports = {
  makeDestination
};