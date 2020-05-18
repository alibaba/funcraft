'use strict';

const pkg = require('../package.json');

const uuid = require('uuid');
const httpx = require('httpx');
const ua = require('universal-analytics');
const _ = require('lodash');
const ci = require('ci-info');
const Conf = require('conf');
const osName = require('os-name');
const { getProfileFromFile, getProfile } = require('../lib/profile');
const querystring = require('query-string');

const detectMocha = require('detect-mocha');

const os = osName();
const packageName = pkg.name;
const nodeVersion = process.version;
const appVersion = pkg.version;

const conf = new Conf({
  configName: `ga-${packageName}`,
  projectName: packageName,
  defaults: {
    cid: uuid.v4()
  }
});

process.on('unhandledRejection', error => {
  require('../lib/exception-handler')(error);
});

var fake = {
  pageview: () => {
    return {
      send: () => { return 'fake'; }
    };
  },
  event: () => {
    return {
      send: () => { return 'fake'; }
    };
  }
};

var fakeMocha = {
  pageview: () => {
    return {
      send: () => { return 'fakeMocha'; }
    };
  },
  event: () => {
    return {
      send: () => { return 'fakeMocha'; }
    };
  }
};

var real = ua('UA-139704598-1', conf.get('cid'));

real.set('cd1', os);
real.set('cd2', nodeVersion);
real.set('cd3', appVersion);

var visitor;

async function getVisitor(returnFakeIfMissingConfig = false) {

  if (!visitor) {
    const profile = await getProfileFromFile();

    // use fake if it is in a ci environment or has never been configured
    if (_.isEmpty(profile)) {

      if (detectMocha()) {
        return fakeMocha;
      }

      if (ci.isCI) {
        real.pageview(`/downloaded/ci/${ci.name}`).send();
      }

      return fake;
    }

    if (profile.report === undefined) {
      if (returnFakeIfMissingConfig) { return fake; }

      if (detectMocha()) {
        return fakeMocha;
      }

      visitor = real;
    }

    if (profile.report === true) {
      visitor = real;
    } else {
      visitor = fake;
    }
  }

  return visitor;
}

async function getTracker() {

  const profile = await getProfile();

  return async function (data) {

    if (!_.isObject(data)) {
      throw new Error('track data must be json');
    }
    
    data.accountID = profile.accountId;
    data.regionId = profile.defaultRegion;
    data.raw = true;

    const queries = querystring.stringify(data);
    const url = `https://1813774388953700.cn-shanghai.fc.aliyuncs.com/2016-08-15/proxy/fc-console.prod/log/?${queries}`;

    await httpx.request(url, {
      method: 'GET',
      timeout: 2000
    });
  };
}

module.exports = { getVisitor, getTracker };
