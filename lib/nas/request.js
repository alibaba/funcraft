'use strict';

const { getFcClient } = require('../client');

const constants = require('./constants');
const PROXY = 'proxy';

function getNasHttpTriggerPath(serviceName) {
  const nasServiceName = constants.FUN_NAS_SERVICE_PREFIX + serviceName;

  return `/${PROXY}/${nasServiceName}/${constants.FUN_NAS_FUNCTION}/`;
}


async function postRequest(path, body, headers, queries, opts) {
  let fcClient = await getFcClient({
    timeout: constants.FUN_NAS_TIMEOUT
  });
  
  return await fcClient.post(path, body, headers, queries, opts);
}

async function sendCmdReqequest(nasHttpTriggerPath, cmd) {
  const urlPath = nasHttpTriggerPath + 'commands';
  const query = { cmd };

  return await postRequest(urlPath, null, null, query)
}

module.exports = {
  sendCmdReqequest,
  getNasHttpTriggerPath
};