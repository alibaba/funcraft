'use strict';
const { doProp } = require('./utils');

function doParseOSSTriggerConfig(triggerResource, triggerConfig) {
  triggerResource.Type = 'OSS';
  const properties = triggerResource.Properties;
  doProp(properties, 'Events', triggerConfig.events);
  doProp(properties, 'BucketName', triggerConfig.bucketName);
  const filter = triggerConfig.filter;
  if (filter) {
    properties.Filter = {
      Key: {
        Prefix: filter.key.prefix,
        Suffix: filter.key.suffix
      }
    };
  }
}

function doParseHttpTriggerConfig(triggerResource, triggerConfig) {
  triggerResource.Type = 'HTTP';
  const properties = triggerResource.Properties;
  doProp(properties, 'AuthType', triggerConfig.authType);
  doProp(properties, 'Methods', triggerConfig.methods);
}

function doParseLogTriggerConfig(triggerResource, triggerConfig) {
  triggerResource.Type = 'Log';
  const properties = triggerResource.Properties;
  properties.SourceConfig = {
    Logstore: triggerConfig.sourceConfig.logstore
  };
  properties.JobConfig = {
    MaxRetryTime: triggerConfig.jobConfig.maxRetryTime,
    TriggerInterval: triggerConfig.jobConfig.triggerInterval
  };
}

function doParseMNSTopicTriggerConfig(triggerResource, triggerConfig) {
  triggerResource.Type = 'MNSTopic';
  const properties = triggerResource.Properties;
  doProp(properties, 'TopicName', triggerConfig.topicName);
  doProp(properties, 'Region', triggerConfig.region);
  doProp(properties, 'NotifyContentFormat', triggerConfig.notifyContentFormat);
  doProp(properties, 'NotifyStrategy', triggerConfig.notifyStrategy);
  doProp(properties, 'FilterTag', triggerConfig.filterTag);
}

function doParseTableStoreTriggerConfig(triggerResource, triggerConfig) {
  triggerResource.Type = 'TableStore';
  const properties = triggerResource.Properties;
  doProp(properties, 'InstanceName', triggerConfig.instanceName);
  doProp(properties, 'TableName', triggerConfig.tableName);
}

function doParseRDSTriggerConfig(triggerResource, triggerConfig) {
  triggerResource.Type = 'RDS';
  const properties = triggerResource.Properties;
  doProp(properties, 'InstanceId', triggerConfig.instanceId);
  doProp(properties, 'SubscriptionObjects', triggerConfig.subscriptionObjects);
  doProp(properties, 'Retry', triggerConfig.retry);
  doProp(properties, 'Concurrency', triggerConfig.concurrency);
  doProp(properties, 'EventFormat', triggerConfig.eventFormat);
}

function doParseTimerTriggerConfig(triggerResource, triggerConfig) {
  triggerResource.Type = 'Timer';
  const properties = triggerResource.Properties;
  doProp(properties, 'Payload', triggerConfig.payload);
  doProp(properties, 'CronExpression', triggerConfig.cronExpression);
  doProp(properties, 'Enable', triggerConfig.enable);
}

function doParseCDNTriggerConfig(triggerResource, triggerConfig) {
  triggerResource.Type = 'CDN';
  const properties = triggerResource.Properties;
  doProp(properties, 'EventName', triggerConfig.eventName);
  doProp(properties, 'EventVersion', triggerConfig.eventVersion);
  doProp(properties, 'Notes', triggerConfig.notes);
  const filter = triggerResource.filter;
  if (filter) {
    properties.Filter = {
      Domain: filter.domain
    };
  }
}

function parseTriggerResource(triggerMeta) {
  const triggerType = triggerMeta.triggerType;
  const triggerResource = {
    Type: '',
    Properties: {}
  };
  const properties = triggerResource.Properties;
  doProp(properties, 'InvocationRole', triggerMeta.invocationRole);
  doProp(properties, 'SourceArn', triggerMeta.sourceArn);
  doProp(properties, 'Qualifier', triggerMeta.qualifier);
  if (triggerType === 'oss') {
    doParseOSSTriggerConfig(triggerResource, triggerMeta.triggerConfig);
  } else if (triggerType === 'log') {
    doParseLogTriggerConfig(triggerResource, triggerMeta.triggerConfig);
  } else if (triggerType === 'timer') {
    doParseTimerTriggerConfig(triggerResource, triggerMeta.triggerConfig);
  } else if (triggerType === 'http') {
    doParseHttpTriggerConfig(triggerResource, triggerMeta.triggerConfig);
  } else if (triggerType === 'tablestore') {
    doParseTableStoreTriggerConfig(triggerResource, triggerMeta.triggerConfig);
  } else if (triggerType === 'cdn_events') {
    doParseCDNTriggerConfig(triggerResource, triggerMeta.triggerConfig);
  } else if (triggerType === 'rds') {
    doParseRDSTriggerConfig(triggerResource, triggerMeta.triggerConfig);
  } else if (triggerType === 'mns_topic') {
    doParseMNSTopicTriggerConfig(triggerResource, triggerMeta.triggerConfig);
  } else {
    throw new Error(`Trigger type is not supported: ${triggerType}.`);
  }
  return triggerResource;
}

module.exports = {
  parseTriggerResource
};
