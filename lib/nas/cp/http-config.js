'use strict';

const { getFcClient } = require('../../client');
const FUN_NAS_SERVICE_PREFIX = 'fun-nas-';
const FUN_NAS_FUNCTION = 'fun-nas-function';
const PROXY = 'proxy';
const timeoutInMillisecond = 600 * 1000;

function getNasHttpTriggerPath(serviceName) {
  const nasServiceName = FUN_NAS_SERVICE_PREFIX + serviceName;
  let commonPath = `/${PROXY}/${nasServiceName}/${FUN_NAS_FUNCTION}/`;
  
  return commonPath;
}

async function getRequest(path, query, headers) {
  const fcClient = await getFcClient();
  return await fcClient.get(path, query, headers);
}

async function postRequest(path, body, headers, queries, opts) {
  let fcClient = await getFcClient(timeoutInMillisecond);
  return await fcClient.post(path, body, headers, queries, opts);
}
module.exports = { getRequest, postRequest, getNasHttpTriggerPath };