'use strict';

const fs = require('fs-extra');

const yaml = require('js-yaml');
const _ = require('lodash');

const mergeTpl = (...tplPaths) => {
  const tpl = tplPaths.reduce((tpl, tplPath) => {
    const tplContent = fs.readFileSync(tplPath, 'utf8');
    const source = yaml.safeLoad(tplContent);
    return _.merge(tpl, source);
  }, {});
  return tpl;
};

module.exports = {
  mergeTpl
};