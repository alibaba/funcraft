'use strict';

const osLocale = require('os-locale');
const MNSClient = require('@alicloud/mns');
const hashedMachineId = require('node-machine-id').machineId;
const pkg = require('../package.json');
const CloudAPI = require('@alicloud/cloudapi');
const TableStore = require('tablestore');
const Log = require('@alicloud/log');
const FC = require('@alicloud/fc2');
const FnFClient = require('@alicloud/fnf-2019-03-15');
const Pop = require('@alicloud/pop-core');
const getProfile = require('./profile').getProfile;
const OSS = require('ali-oss');
const debug = require('debug');
const {
  throwProcessedFCPermissionError,
  throwProcessedPopPermissionError,
  throwProcessedSLSPermissionError
} = require('./error-message');

const getRosClient = async () => {
  return await getPopClient('http://ros.aliyuncs.com', '2019-09-10');
};

const getOssClient = async (bucket) => {
  const profile = await getProfile();

  if (!bucket) {
    return OSS({
      region: 'oss-' + profile.defaultRegion,
      accessKeyId: profile.accessKeyId,
      accessKeySecret: profile.accessKeySecret,
      stsToken: profile.securityToken,
      timeout: profile.timeout * 1000
    });
  }

  const location = await OSS({
    accessKeyId: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    stsToken: profile.securityToken,
    bucket,
    region: 'oss-' + profile.defaultRegion
  }).getBucketLocation(bucket);

  debug('use bucket region %s', location.location);

  const client = OSS({
    accessKeyId: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    stsToken: profile.securityToken,
    bucket,
    region: location.location,
    timeout: profile.timeout * 1000
  });

  return client;
};

const getFcClient = async (opts = {}) => {
  const profile = await getProfile();

  const locale = await osLocale();

  const mid = await hashedMachineId();

  FC.prototype.getAccountSettings = function(options = {}, headers = {}) {
    return this.get('/account-settings', options, headers);
  };

  const accountId = profile.accountId ? profile.accountId : 'accountId';
  const accessKeyID = profile.accessKeyId ? profile.accessKeyId : 'accessKeyID';
  const accessKeySecret = profile.accessKeySecret ? profile.accessKeySecret : 'accessKeySecret';
  const securityToken = profile.securityToken;
  const region = profile.defaultRegion ? profile.defaultRegion : 'cn-hangzhou';

  const enable = profile.enableCustomEndpoint === true || profile.enableCustomEndpoint === 'true';
  const endpoint = profile.fcEndpoint ? profile.fcEndpoint : (enable ? profile.endpoint : undefined);

  const fc = new FC(accountId, {
    accessKeyID, accessKeySecret, securityToken, region, endpoint,
    timeout: opts.timeout || profile.timeout * 1000,
    secure: profile.protocol !== 'http',
    headers: {
      'user-agent': `${pkg.name}/v${pkg.version} ( Node.js ${process.version}; OS ${process.platform} ${process.arch}; language ${locale}; mid ${mid})`
    }
  });
  const realRequest = fc.request.bind(fc);
  fc.request = async (method, path, query, body, headers, opts = {}) => {
    try {
      return await realRequest(method, path, query, body, headers || {}, opts || {});
    } catch (ex) {
      await throwProcessedFCPermissionError(ex, ...path.split('/').filter(p => !!p));
      throw ex;
    }
  };

  return fc;
};

const getFnFClient = async () => {
  const profile = await getProfile();

  return new FnFClient({
    endpoint: `https://${profile.accountId}.${profile.defaultRegion}.fnf.aliyuncs.com`,
    accessKeyId: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    securityToken: profile.securityToken
  });
};

const getPopClient = async (endpoint, apiVersion) => {
  const profile = await getProfile();

  const pop = new Pop({
    endpoint: endpoint,
    apiVersion: apiVersion,
    accessKeyId: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    securityToken: profile.securityToken,
    opts: {
      timeout: profile.timeout * 1000
    }
  });

  const realRequest = pop.request.bind(pop);
  pop.request = async (action, params, options) => {
    try {
      return await realRequest(action, params, options);
    } catch (ex) {
      await throwProcessedPopPermissionError(ex, action);
      throw ex;
    }
  };

  return pop;
};

const getOtsPopClient = async () => {
  const profile = await getProfile();

  return await getPopClient(`http://ots.${profile.defaultRegion}.aliyuncs.com`, '2016-06-20');
};

const getVpcPopClient = async () => {
  return await getPopClient('https://vpc.aliyuncs.com', '2016-04-28');
};

const getEcsPopClient = async () => {
  return await getPopClient('https://ecs.aliyuncs.com', '2014-05-26');
};

const getNasPopClient = async () => {

  const profile = await getProfile();

  return await getPopClient(`http://nas.${profile.defaultRegion}.aliyuncs.com`, '2017-06-26');
};

const getXtraceClient = async () => {
  const { defaultRegion } = await getProfile();

  return await getPopClient(`https://xtrace.${defaultRegion}.aliyuncs.com`, '2019-08-08');
};

const getOtsClient = async (instanceName) => {
  const profile = await getProfile();

  var endpoint = `http://${instanceName}.${profile.defaultRegion}.ots.aliyuncs.com`;
  return new TableStore.Client({
    accessKeyId: profile.accessKeyId,
    secretAccessKey: profile.accessKeySecret,
    securityToken: profile.securityToken,
    endpoint: endpoint,
    instancename: instanceName
  });
};

const getMnsClient = async (topicName, region) => {
  const profile = await getProfile();

  return new MNSClient(profile.accountId, {
    region: region,
    accessKeyId: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    securityToken: profile.securityToken,
    // optional & default
    secure: false, // use https or http
    internal: false, // use internal endpoint
    vpc: false // use vpc endpoint
  });
};

const getCloudApiClient = async () => {
  const profile = await getProfile();

  return new CloudAPI({
    accessKeyId: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    securityToken: profile.securityToken,
    endpoint: `http://apigateway.${profile.defaultRegion}.aliyuncs.com`,
    opts: {
      timeout: profile.timeout * 1000
    }
  });
};

const getSlsClient = async () => {
  const profile = await getProfile();

  const log = new Log({
    region: profile.defaultRegion,
    accessKeyId: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    securityToken: profile.securityToken
  });

  const realRequest = log._request.bind(log);
  log._request = async (verb, projectName, path, queries, body, headers, options) => {
    try {
      return await realRequest(verb, projectName, path, queries, body, headers, options);
    } catch (ex) {
      await throwProcessedSLSPermissionError(ex);
      throw ex;
    }
  };

  return log;
};

module.exports = {
  getXtraceClient,
  getFcClient,
  getOtsClient,
  getOtsPopClient,
  getMnsClient,
  getCloudApiClient,
  getSlsClient,
  getPopClient,
  getVpcPopClient,
  getEcsPopClient,
  getNasPopClient,
  getOssClient,
  getRosClient,
  getFnFClient
};