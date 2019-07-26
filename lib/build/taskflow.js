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

function needBuildUsingContainer(taskFlows, useContaienr) {

  const FunYmlTaskFlow = findFunYmlTaskFlow(taskFlows);

  let forceContainer = false;

  if (FunYmlTaskFlow) {
    forceContainer = true;  
  }

  if (!useContaienr && forceContainer) {
    console.log(yellow('detected fun.yml, will use container to build forcely'));
  }

  return forceContainer;
}

module.exports = {
  needBuildUsingContainer,
  isOnlyFunYmlTaskFlow
};