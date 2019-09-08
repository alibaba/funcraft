'use strict';

const osLocale = require('os-locale');
const MNSClient = require('@alicloud/mns');
const hashedMachineId = require('node-machine-id').machineId;
const pkg = require('../package.json');
const CloudAPI = require('@alicloud/cloudapi');
const TableStore = require('tablestore');
const Log = require('@alicloud/log');
const FC = require('@alicloud/fc2');
const Pop = require('@alicloud/pop-core');
const getProfile = require('./profile').getProfile;
const OSS = require('ali-oss');
const debug = require('debug');

const getRosClient = async () => {
  return await getPopClient('http://ros.aliyuncs.com', '2019-09-10');
};

const getOssClient = async (bucket) => {
  const profile = await getProfile();

  const location = await OSS({
    accessKeyId: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    bucket,
    region: 'oss-' + profile.defaultRegion
  }).getBucketLocation(bucket);

  debug('use bucket region %s', location.location);

  const client = OSS({
    accessKeyId: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    bucket,
    region: location.location
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

  const fc = new FC(profile.accountId, {
    accessKeyID: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    endpoint: profile.fcEndpoint,
    region: profile.defaultRegion,
    timeout: opts.timeout || profile.timeout * 1000,
    secure: profile.protocol !== 'http',
    headers: {
      'user-agent': `${pkg.name}/v${pkg.version} ( Node.js ${process.version}; OS ${process.platform} ${process.arch}; language ${locale}; mid ${mid})`
    }
  });

  return fc;
};

const getPopClient = async (endpoint, apiVersion) => {
  const profile = await getProfile();

  return new Pop({
    endpoint: endpoint,
    apiVersion: apiVersion,
    accessKeyId: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret,
    opts: {
      timeout: profile.timeout * 1000
    }
  });
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

const getOtsClient = async (instanceName) => {
  const profile = await getProfile();

  var endpoint = `http://${instanceName}.${profile.defaultRegion}.ots.aliyuncs.com`;
  return new TableStore.Client({
    accessKeyId: profile.accessKeyId,
    secretAccessKey: profile.accessKeySecret,
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
    endpoint: `http://apigateway.${profile.defaultRegion}.aliyuncs.com`,
    opts: {
      timeout: profile.timeout * 1000
    }
  });
};

const getSlsClient = async () => {
  const profile = await getProfile();

  return new Log({
    region: profile.defaultRegion,
    accessKeyId: profile.accessKeyId,
    accessKeySecret: profile.accessKeySecret
  });
};

module.exports = {
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
  getRosClient
};