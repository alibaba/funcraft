'use strict';

const _ = require('lodash');
const { yellow } = require('colors');

function isOnlyFunYmlTaskFlow(taskFlows) {
  if (taskFlows.length !== 1) { return false; }

  return taskFlows[0].name === 'FunYmlTaskFlow';
}

function findFunYmlTaskFlow(taskFlows) {
  const FunYmlTaskFlow = _.find(taskFlows, (taskFlow) => {
    return taskFlow.name === 'FunYmlTaskFlow';
  });

  return FunYmlTaskFlow;
}

function needBuildUsingDocker(taskFlows, useDocker) {

  const FunYmlTaskFlow = findFunYmlTaskFlow(taskFlows);

  let forceDocker = false;

  if (FunYmlTaskFlow) {
    forceDocker = true;  
  }

  if (!useDocker && forceDocker) {
    console.log(yellow('detected fun.yml, will use container to build forcely'));
  }

  return forceDocker;
}

module.exports = {
  needBuildUsingDocker,
  isOnlyFunYmlTaskFlow
};