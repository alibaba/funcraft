'use strict';

const FUN_NAS_SERVICE_PREFIX = 'fun-nas-';
const FUN_NAS_FUNCTION = 'fun-nas-function';

async function getFcNasUrl(serviceName) {
  const profile = await require('../../profile').getProfile();
  const accountId = profile.accountId;
  const region = profile.defaultRegion;

  const nasServiceName = FUN_NAS_SERVICE_PREFIX + serviceName;

  const fcNasUrl = `https://${accountId}.${region}.fc.aliyuncs.com/2016-08-15/proxy/${nasServiceName}/${FUN_NAS_FUNCTION}/`;
  
  return fcNasUrl;
}

module.exports = { getFcNasUrl };