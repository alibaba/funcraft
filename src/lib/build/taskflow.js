'use strict';

function isOnlyDefaultTaskFlow(taskFlows) {
  if (taskFlows.length !== 1) { return false; }

  return taskFlows[0].name === 'DefaultTaskFlow';
}

module.exports = {
  isOnlyDefaultTaskFlow
};