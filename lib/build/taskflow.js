'use strict';

const _ = require('lodash');
const { yellow } = require('colors');

function isOnlyDefaultTaskFlow(taskFlows) {
  if (taskFlows.length !== 1) { return false; }

  return taskFlows[0].name === 'DefaultTaskFlow';
}

module.exports = {
  isOnlyDefaultTaskFlow
};