'use strict';

const _ = require('lodash');

const ram = require('./ram');
const util = require('util');
const debug = require('debug')('fun:trigger');
const getProfile = require('./profile').getProfile;

const { red, yellow } = require('colors');
const { getFcClient } = require('./client');
const { iterateResources } = require('./definition');

const triggerTypeMapping = {
  'Datahub': 'datahub',
  'Timer': 'timer',
  'HTTP': 'http',
  'Log': 'log',
  'OSS': 'oss',
  'RDS': 'rds',
  'MNSTopic': 'mns_topic',
  'TableStore': 'tablestore',
  'CDN': 'cdn_events'
};

async function getSourceArn(triggerType, triggerProperties) {
  const profile = await getProfile();

  if (triggerType === 'Log') {
    return `acs:log:${profile.defaultRegion}:${profile.accountId}:project/${triggerProperties.LogConfig.Project}`;
  } else if (triggerType === 'RDS') {
    return `acs:rds:${profile.defaultRegion}:${profile.accountId}:dbinstance/${triggerProperties.InstanceId}`;
  } else if (triggerType === 'MNSTopic') {
    if (triggerProperties.Region !== undefined) {
      return `acs:mns:${triggerProperties.Region}:${profile.accountId}:/topics/${triggerProperties.TopicName}`;
    }
    return `acs:mns:${profile.defaultRegion}:${profile.accountId}:/topics/${triggerProperties.TopicName}`;
  } else if (triggerType === 'TableStore') {
    return `acs:ots:${profile.defaultRegion}:${profile.accountId}:instance/${triggerProperties.InstanceName}/table/${triggerProperties.TableName}`;
  } else if (triggerType === 'OSS') {
    return `acs:oss:${profile.defaultRegion}:${profile.accountId}:${triggerProperties.BucketName || triggerProperties.bucketName}`;
  } else if (triggerType === 'CDN') {
    return `acs:cdn:*:${profile.accountId}`;
  }
  return;
}

async function getTriggerNameList({
  serviceName,
  functionName
}) {
  const fc = await getFcClient();
  var listTriggerResponse = await fc.listTriggers(serviceName, functionName);

  var triggerNameArray = [];

  if (listTriggerResponse && listTriggerResponse.data.triggers) {
    triggerNameArray = listTriggerResponse.data.triggers.map(p => p.triggerName);
  }
  return triggerNameArray;
}

function getTriggerConfig(triggerType, triggerProperties) {
  if (triggerType === 'Timer') {
    return {
      payload: triggerProperties.Payload,
      cronExpression: triggerProperties.CronExpression,
      enable: triggerProperties.Enable
    };
  } else if (triggerType === 'HTTP') {
    return {
      authType: (triggerProperties.AuthType).toLowerCase(),
      methods: triggerProperties.Methods
    };
  } else if (triggerType === 'Log') {
    const logConfig = triggerProperties.LogConfig;
    const jobConfig = triggerProperties.JobConfig;
    const sourceConfig = triggerProperties.SourceConfig;
    return {
      sourceConfig: {
        logstore: sourceConfig.Logstore
      },
      jobConfig: {
        maxRetryTime: jobConfig.MaxRetryTime,
        triggerInterval: jobConfig.TriggerInterval
      },
      logConfig: {
        project: logConfig.Project,
        logstore: logConfig.Logstore
      },
      functionParameter: triggerProperties.FunctionParameter || {},
      Enable: !(triggerProperties.Enable === false)
    };
  } else if (triggerType === 'RDS') {
    return {
      subscriptionObjects: triggerProperties.SubscriptionObjects,
      retry: triggerProperties.Retry,
      concurrency: triggerProperties.Concurrency,
      eventFormat: triggerProperties.EventFormat
    };
  } else if (triggerType === 'MNSTopic') {
    var notifyContentFormat = 'STREAM';
    if (triggerProperties.NotifyContentFormat !== undefined) {
      notifyContentFormat = triggerProperties.NotifyContentFormat;
    }
    var notifyStrategy = 'BACKOFF_RETRY';
    if (triggerProperties.NotifyStrategy !== undefined) {
      notifyStrategy = triggerProperties.NotifyStrategy;
    }
    var triggerCfg = {
      NotifyContentFormat: notifyContentFormat,
      NotifyStrategy: notifyStrategy
    };
    if (triggerProperties.FilterTag !== undefined) {
      triggerCfg.FilterTag = triggerProperties.FilterTag;
    }
    return triggerCfg;
  } else if (triggerType === 'TableStore') {
    return {};
  } else if (triggerType === 'OSS') {
    return {
      events: triggerProperties.Events || triggerProperties.events,
      filter: triggerProperties.Filter || triggerProperties.filter
    };
  } else if (triggerType === 'CDN') {
    return {
      eventName: triggerProperties.EventName,
      eventVersion: triggerProperties.EventVersion,
      notes: triggerProperties.Notes,
      filter: _.mapKeys(triggerProperties.Filter, (value, key) => {
        return _.lowerFirst(key);
      })
    };
  }
  console.error(`trigger type is ${triggerType} not supported.`);
}

async function makeInvocationRole(serviceName, functionName, triggerType) {
  if (triggerType === 'Log') {

    const invocationRoleName = ram.normalizeRoleOrPoliceName(`AliyunFcGeneratedInvocationRole-${serviceName}-${functionName}`);

    const invocationRole = await ram.makeRole(invocationRoleName, true, 'Used for fc invocation', {
      'Statement': [{
        'Action': 'sts:AssumeRole',
        'Effect': 'Allow',
        'Principal': {
          'Service': [
            'log.aliyuncs.com'
          ]
        }
      }],
      'Version': '1'
    });

    const policyName = ram.normalizeRoleOrPoliceName(`AliyunFcGeneratedInvocationPolicy-${serviceName}-${functionName}`);

    await ram.makePolicy(policyName, {
      'Version': '1',
      'Statement': [{
        'Action': [
          'fc:InvokeFunction'
        ],
        'Resource': `acs:fc:*:*:services/${serviceName}/functions/*`,
        'Effect': 'Allow'
      },
      {
        'Action': [
          'log:Get*',
          'log:List*',
          'log:PostLogStoreLogs',
          'log:CreateConsumerGroup',
          'log:UpdateConsumerGroup',
          'log:DeleteConsumerGroup',
          'log:ListConsumerGroup',
          'log:ConsumerGroupUpdateCheckPoint',
          'log:ConsumerGroupHeartBeat',
          'log:GetConsumerGroupCheckPoint'
        ],
        'Resource': '*',
        'Effect': 'Allow'
      }
      ]
    });

    await ram.attachPolicyToRole(policyName, invocationRoleName, 'Custom');
    return invocationRole.Role;

  } else if (triggerType === 'RDS' || triggerType === 'MNSTopic') {

    const invocationRoleName = ram.normalizeRoleOrPoliceName(`FunCreateRole-${serviceName}-${functionName}`);
    var tMap = {
      'RDS': 'rds',
      'MNSTopic': 'mns'
    };
    var principalService = util.format('%s.aliyuncs.com', tMap[triggerType]);

    const invocationRole = await ram.makeRole(invocationRoleName, true, 'Used for fc invocation', {
      'Statement': [{
        'Action': 'sts:AssumeRole',
        'Effect': 'Allow',
        'Principal': {
          'Service': [
            principalService
          ]
        }
      }],
      'Version': '1'
    });

    const policyName = ram.normalizeRoleOrPoliceName(`FunCreatePolicy-${serviceName}-${functionName}`);

    await ram.makePolicy(policyName, {
      'Version': '1',
      'Statement': [{
        'Action': [
          'fc:InvokeFunction'
        ],
        'Resource': `acs:fc:*:*:services/${serviceName}/functions/*`,
        'Effect': 'Allow'
      }]
    });

    await ram.attachPolicyToRole(policyName, invocationRoleName, 'Custom');

    return invocationRole.Role;

  } else if (triggerType === 'TableStore') {
    const invocationRoleName = ram.normalizeRoleOrPoliceName(`FunCreateRole-${serviceName}-${functionName}`);

    const invocationRole = await ram.makeRole(invocationRoleName, true, 'Used for fc invocation', {
      'Statement': [{
        'Action': 'sts:AssumeRole',
        'Effect': 'Allow',
        'Principal': {
          'RAM': [
            'acs:ram::1604337383174619:root'
          ]
        }
      }],
      'Version': '1'
    });

    const invkPolicyName = ram.normalizeRoleOrPoliceName(`FunCreateInvkPolicy-${serviceName}-${functionName}`);

    await ram.makePolicy(invkPolicyName, {
      'Version': '1',
      'Statement': [{
        'Action': [
          'fc:InvokeFunction'
        ],
        'Resource': '*',
        'Effect': 'Allow'
      }]
    });

    await ram.attachPolicyToRole(invkPolicyName, invocationRoleName, 'Custom');

    const otsReadPolicyName = ram.normalizeRoleOrPoliceName(`FunCreateOtsReadPolicy-${serviceName}-${functionName}`);

    await ram.makePolicy(otsReadPolicyName, {
      'Version': '1',
      'Statement': [{
        'Action': [
          'ots:BatchGet*',
          'ots:Describe*',
          'ots:Get*',
          'ots:List*'
        ],
        'Resource': '*',
        'Effect': 'Allow'
      }]
    });

    await ram.attachPolicyToRole(otsReadPolicyName, invocationRoleName, 'Custom');

    return invocationRole.Role;
  } else if (triggerType === 'OSS') {

    const invocationRoleName = ram.normalizeRoleOrPoliceName(`FunCreateRole-${serviceName}-${functionName}`);

    const invocationRole = await ram.makeRole(invocationRoleName, true, 'Used for fc invocation', {
      'Statement': [
        {
          'Action': 'sts:AssumeRole',
          'Effect': 'Allow',
          'Principal': {
            'Service': [
              'oss.aliyuncs.com'
            ]
          }
        }
      ],
      'Version': '1'
    });

    const policyName = ram.normalizeRoleOrPoliceName(`FunCreateOSSPolicy-${serviceName}-${functionName}`);

    await ram.makePolicy(policyName, {
      'Version': '1',
      'Statement': [{
        'Action': [
          'fc:InvokeFunction'
        ],
        'Resource': `acs:fc:*:*:services/${serviceName}/functions/*`,
        'Effect': 'Allow'
      }]
    });

    await ram.attachPolicyToRole(policyName, invocationRoleName, 'Custom');
    return invocationRole.Role;

  } else if (triggerType === 'CDN') {

    const invocationRoleName = ram.normalizeRoleOrPoliceName(`FunCreateRole-${serviceName}-${functionName}`);

    const invocationRole = await ram.makeRole(invocationRoleName, true, 'Used for fc invocation', {
      'Statement': [
        {
          'Action': 'sts:AssumeRole',
          'Effect': 'Allow',
          'Principal': {
            'Service': [
              'cdn.aliyuncs.com'
            ]
          }
        }
      ],
      'Version': '1'
    });

    const policyName = ram.normalizeRoleOrPoliceName(`FunCreateCDNPolicy-${serviceName}-${functionName}`);

    await ram.makePolicy(policyName, {
      'Version': '1',
      'Statement': [{
        'Action': [
          'fc:InvokeFunction'
        ],
        'Resource': `acs:fc:*:*:services/${serviceName}/functions/*`,
        'Effect': 'Allow'
      }]
    });

    await ram.attachPolicyToRole(policyName, invocationRoleName, 'Custom');
    return invocationRole.Role;
  }
  return;
}

async function deleteTrigger(serviceName, functionName, triggerName) {
  const fc = await getFcClient();
  await fc.deleteTrigger(serviceName, functionName, triggerName);
}

async function makeTrigger({
  serviceName,
  functionName,
  triggerName,
  triggerType,
  triggerProperties
}) {
  const fc = await getFcClient();
  var trigger;
  try {
    trigger = await fc.getTrigger(serviceName, functionName, triggerName);
  } catch (ex) {
    if (ex.code !== 'TriggerNotFound') {
      throw ex;
    }
  }

  const params = {
    triggerType: triggerTypeMapping[triggerType],
    triggerConfig: getTriggerConfig(triggerType, triggerProperties)
  };

  debug('serviceName is %s, functionName is %s, trigger params is %j', serviceName, functionName, params);

  let invocationRoleArn = triggerProperties.InvocationRole;

  if (!invocationRoleArn) {
    const invocationRole = await makeInvocationRole(serviceName, functionName, triggerType);

    if (invocationRole) {
      invocationRoleArn = invocationRole.Arn;
    }
  }

  if (invocationRoleArn) {
    Object.assign(params, {
      'invocationRole': invocationRoleArn
    });
  }

  const sourceArn = await getSourceArn(triggerType, triggerProperties);
  if (sourceArn) {
    Object.assign(params, {
      'sourceArn': sourceArn
    });
  }

  if (triggerProperties.Qualifier) {
    Object.assign(params, {
      'qualifier': triggerProperties.Qualifier
    });
  }

  if (!trigger) {
    params.triggerName = triggerName;
    trigger = await fc.createTrigger(serviceName, functionName, params);
  } else {
    if (triggerType === 'TableStore' || triggerType === 'MNSTopic') {
      // no triggerConfig, so no updateTrigger, first delete, then create
      // await fc.deleteTrigger(serviceName, functionName, triggerName);
      // params.triggerName = triggerName;
      // trigger = await fc.createTrigger(serviceName, functionName, params);
      console.log(red(`\t\tWarning: TableStore and MNSTopic Trigger cann't update`));
      return;
    }
    trigger = await fc.updateTrigger(serviceName, functionName, triggerName, params);
  }

  return trigger;
}

function findFunctionsInCustomDomain(tpl = {}) {
  const functions = [];

  iterateResources(tpl.Resources, 'Aliyun::Serverless::CustomDomain', (domainLogicId, domainDefinition) => {
    const properties = (domainDefinition.Properties || {});
    const routeConfig = properties.RouteConfig || {};
    const routes = routeConfig.Routes || routeConfig.routes;

    if (_.isEmpty(routes)) { return; }

    for (const route of Object.entries(routes)) {
      const serviceName = route[1].ServiceName || route[1].serviceName;
      const functionName = route[1].FunctionName || route[1].functionName;
      functions.push({
        serviceName,
        functionName
      });
    }
  });

  return functions;
}

function functionBindCustomDomain(serviceName, functionName, tpl) {
  const functions = findFunctionsInCustomDomain(tpl);
  const bindFunction = _.find(functions, { serviceName, functionName });
  return !_.isEmpty(bindFunction);
}

async function displayTriggerInfo(serviceName, functionName, triggerName, triggerType, triggerProperties, wrap, tpl) {
  if (triggerType === 'HTTP' || triggerType === 'http') {

    const profile = await getProfile();

    const accountId = profile.accountId;
    const region = profile.defaultRegion;

    const resolveWrap = wrap || '';

    if (triggerName) {
      console.log(`${resolveWrap}triggerName: ${yellow(triggerName)}`);
    }

    console.log(`${resolveWrap}methods: ${yellow(triggerProperties.Methods || triggerProperties.methods)}`);

    if (!functionBindCustomDomain(serviceName, functionName, tpl)) {
      console.log(`${resolveWrap}url: ` + yellow(`https://${accountId}.${region}.fc.aliyuncs.com/2016-08-15/proxy/${serviceName}/${functionName}/`));
      console.log(red(`${resolveWrap}Http Trigger will forcefully add a 'Content-Disposition: attachment' field to the response header, which cannot be overwritten \n${resolveWrap}and will cause the response to be downloaded as an attachment in the browser. This issue can be avoided by using CustomDomain.\n`));
    }
  }
}

module.exports = {
  getTriggerNameList,
  getTriggerConfig,
  makeTrigger,
  deleteTrigger,
  makeInvocationRole,
  displayTriggerInfo
};