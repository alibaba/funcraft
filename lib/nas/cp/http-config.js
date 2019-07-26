'use strict';

const { getFcClient } = require('../../client');

const FUN_NAS_SERVICE_PREFIX = 'fun-nas-';
const FUN_NAS_FUNCTION = 'fun-nas-function';
const PROXY = 'proxy';
const timeoutVal = 600 * 1000;


function getNasHttpTriggerPath(serviceName) {
  const nasServiceName = FUN_NAS_SERVICE_PREFIX + serviceName;
  let commonPath = `/${PROXY}/${nasServiceName}/${FUN_NAS_FUNCTION}/`;
  //let commonPath = `/${PROXY}/demo-service/demo/`;
  return commonPath;
}

async function getRequest(path, query, headers) {
  let fcClient = await getFcClient();
  let getRequest = await fcClient.get(path, query, headers);
  return getRequest;
}

async function postRequest(path, body, headers, queries, opts) {
  let fcClient = await getFcClient(timeoutVal);
  let postRequest = await fcClient.post(path, body, headers, queries, opts);
  return postRequest; 
}
module.exports = { getRequest, postRequest, getNasHttpTriggerPath };