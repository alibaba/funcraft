'use strict';

const jsonDiff = require('json-diff');
const _ = require('lodash');
const Table = require('cli-table3');

const definition = require('../definition');
const { yellow } = require('colors');
const tableHeads = ['Resource', 'ResourceType', 'Action', 'Property'];

// 需要特殊处理的写成函数，有默认值的写成值，其他场景默认值认为是 null
const DEFAULT_VALUES = {
  'Aliyun::Serverless::Service': {
    InternetAccess: true,
    Role: ({ action, oldPropsValue }) => {
      if (action === 'Delete') {
        return oldPropsValue 
          && oldPropsValue.startsWith('acs:ram::') 
          && _.includes(oldPropsValue, 'role/aliyunfcgeneratedrole-cn-');
      } 
      
      return false;
    },
    VpcConfig: ({ action, localProps }) => {
      if (action === 'Delete' && localProps && localProps['NasConfig']) {
        const nasConfig = localProps['NasConfig'];
        return definition.isNasAutoConfig(nasConfig);
      }
    },
    NasConfig: ({ action, newPropsValue }) => {
      if (action === 'Modify') {
        // todo: 只有是 NasConfig: Auto，且远端是 auto 创建的资源（比如挂载点必须是 /mnt/auto，userId 是 10003 等），才能认为无变化，这里先忽略这个规则，只要是 Auto，且远端配置了 NasConfig，就认为没有变化
        if (definition.isNasAutoConfig(newPropsValue)) {
          return true;
        }
      }

      return false;
    }
  },
  'Aliyun::Serverless::Function': {
    MemorySize: 128,
    Timeout: 3,
    InitializationTimeout: 3,
    CodeUri: () => {
      return false;
    },
    EnvironmentVariables: ({ action, oldPropsValue }) => {
      if (action === 'Delete') {
        if (!_.isPlainObject(oldPropsValue)) {
          return false;
        }

        const userEnvs = _.reject(Object.keys(oldPropsValue), (envKey) => {
          _.includes(['PYTHONUSERBASE', 'LD_LIBRARY_PATH', 'PATH', 'PYTHONPATH'], envKey);
        });
        
        return userEnvs.length !== 0;
      }
    }
  },
  'HTTP': {
    AuthType: ({ oldPropsValue, newPropsValue }) => {
      return _.isEqual(_.upperCase(oldPropsValue), _.upperCase(newPropsValue));
    }
  }
};

function isDefaultValue(resourceType, action, propsKey, propsValue, localProps) {
  let testFunction = _.get(DEFAULT_VALUES, [resourceType, propsKey]);

  if (testFunction === undefined) {
    return false;
  }

  let oldPropsValue = null;
  let newPropsValue = null;

  if (action === 'Delete') {
    oldPropsValue = propsValue;
  } else { // Modify
    oldPropsValue = propsValue['__old'];
    newPropsValue = propsValue['__new'];
  }

  if (_.isFunction(testFunction)) {
    return testFunction({ resourceType, action, oldPropsValue, newPropsValue, localProps });
  } 
  if (action === 'Delete') {
    const defaultValue = testFunction;
    return defaultValue === propsValue;
  } return false;
  
}

function getTableInstance(head) {
  return new Table({
    head,
    style: {
      head: ['green'],
      border: [] //disable colors for the border
    }
  });
}

// ┌────────────────┬──────────────────────┬────────┬─────────────┐
// │ Id             │ ResourceType         │ Action │ Propertity  │
// ├────────────────┼──────────────────────┼────────┼─────────────┤
// │ RosDemo        │ ALIYUN::FC::Service  │ Modify │ Description │
// ├────────────────┼──────────────────────┼────────┼─────────────┤
// │                │                      │        │ Code        │
// │                │                      │        ├─────────────┤
// │ RosDemoRosDemo │ ALIYUN::FC::Function │ Modify │ Timeout     │
// │                │                      │        ├─────────────┤
// │                │                      │        │ Runtime     │
// └────────────────┴──────────────────────┴────────┴─────────────┘
function displayChanges(changes) {
  if (_.isEmpty(changes)) { return; }

  console.log(yellow(`\nResources Changes(Beta version! Only FC resources changes will be displayed):\n`));

  const table = getTableInstance(tableHeads);

  const map = new Map();

  _.forEach(changes, change => {
    // key: [Id, ResourceType, Action]
    // value: [Name1, Name2.....]
    const id = change.id;
    const resourceType = change.resourceType;
    const action = change.action;

    const key = [id, resourceType, action];
    const joinedKey = key.join('.');
    const propsName = change.propsName;

    let value = map.get(joinedKey);
    if (value) {
      value.push(propsName);
    } else {
      value = [propsName];
    }

    map.set(joinedKey, value);
  });

  for (let [key, value] of map.entries()) {
    const keys = _.split(key, '.');

    const valueSize = value.length;

    const line = [
      { rowSpan: valueSize, content: keys[0], vAlign: 'center' },
      { rowSpan: valueSize, content: keys[1], vAlign: 'center' },
      { rowSpan: valueSize, content: keys[2], vAlign: 'center' }
    ];

    if (_.isEmpty(value)) {

      line.push('');
      table.push(line);
    } else {
      let first = true;

      for (const pro of value) {
        if (first) {
          line.push(pro);
          table.push(line);
          first = false;
        } else {
          table.push([pro]);
        }
      }
    }
  }
  console.log(table.toString());
  console.log();
}

const ADDED_SUFFIX = '__added';
const DELETED_SUFFIX = '__deleted';

function removeDiffSuffix(key) {
  if (_.endsWith(key, ADDED_SUFFIX)) {
    return key.substring(0, key.length - ADDED_SUFFIX.length);
  } else if (_.endsWith(key, DELETED_SUFFIX)) {
    return key.substring(0, key.length - DELETED_SUFFIX.length);
  } 
  
  return key;
}

function detectAction(key, value) {
  if (_.endsWith(key, ADDED_SUFFIX)) {
    return 'Add';
  } else if (_.endsWith(key, DELETED_SUFFIX)) {
    return 'Delete';
  } else if (value && value['__new']) {
    return 'Modify';
  } return null;
}

function processResources(resources, localResources, remoteResources, pAction) {
  const changes = [];
  
  if (!resources) { return changes; }

  for (const [key, res] of Object.entries(resources)) {
    if (!_.isPlainObject(res)) { continue; }

    let originKey = removeDiffSuffix(key);
    const parentAction = detectAction(key) || pAction;

    const localRes = (localResources || {})[originKey];
    const remoteRes = (remoteResources || {})[originKey];

    if (!_.isPlainObject(localRes)) { continue; }

    const resourceType = (localRes || remoteRes).Type;

    if (resourceType !== 'Aliyun::Serverless::Service'
      && resourceType !== 'Aliyun::Serverless::Function'
      && resourceType !== 'HTTP'
      && originKey !== 'Events') {
      continue;
    }

    const props = res.Properties || {};

    if (props) {
      const localProps = (localRes || {}).Properties;

      for (const [propsKey, propsValue] of Object.entries(props)) {
        const originPropsKey = removeDiffSuffix(propsKey);
        let action = detectAction(propsKey, propsValue);

        if (parentAction !== 'Add' && isDefaultValue(resourceType, action, originPropsKey, propsValue, localProps)) {
          continue;
        }

        // 内嵌的对象属性更新了，比如 VpcConfig 里面的值变化了
        if (action === null) { action = parentAction; }
        else if (originPropsKey === 'CodeUri') {
          action = 'Modify';
        }

        changes.push({
          id: originKey,
          resourceType,
          action,
          propsName: originPropsKey
        });
      }
    }

    // 递归处理其他 resources
    changes.push(...processResources(res, localRes, remoteRes, parentAction));
  }

  return changes;
}

async function showResourcesChanges(localYml, remoteYml) {
  const diff = jsonDiff.diff(remoteYml, localYml);

  const resources = diff.Resources;
  const localResources = localYml.Resources;
  const remoteResources = remoteYml.Resources;
  const changes = [];

  if (!resources) { return; }

  changes.push(...processResources(resources, localResources, remoteResources));

  displayChanges(changes);
}

module.exports = {
  displayChanges,
  showResourcesChanges,
  processResources
};
