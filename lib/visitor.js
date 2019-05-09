'use strict';

const pkg = require('../package.json');

const uuid = require('uuid');

var ua = require('universal-analytics');
const Conf = require('conf');
const osName = require('os-name');

const os = osName();
const packageName = pkg.name;
const nodeVersion = process.version;
const appVersion = this.packageVersion;

const conf = new Conf({
  configName: `ga-${packageName}`,
  defaults: {
    cid: uuid.v4()
  }
});

var visitor = ua('UA-139704598-1', conf.get('cid'));

visitor.set('cd1', os);
visitor.set('cd2', nodeVersion);
visitor.set('cd3', appVersion);

module.exports = visitor;