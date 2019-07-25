'use strict';

const oss = {
  triggerType: 'oss',
  triggerName: 'oss',
  invocationRole: 'invocationRole',
  sourceArn: 'sourceArn',
  qualifier: 'qualifier',
  triggerConfig: {
    events: ['put'],
    bucketName: 'bucketName',
    filter: {
      key: {
        prefix: 'prefix',
        suffix: 'suffix'
      }
    }
  }
};

const http = {
  triggerType: 'http',
  triggerName: 'http',
  triggerConfig: {
    authType: 'function',
    methods: ['get', 'post']
  }
};

const log = {
  triggerType: 'log',
  triggerName: 'log',
  triggerConfig: {
    sourceConfig: {
      logstore: 'logstore'
    },
    jobConfig: {
      maxRetryTime: 2,
      triggerInterval: 60
    }
  }
};

const mnsTopic = {
  triggerType: 'mns_topic',
  triggerName: 'mns_topic',
  triggerConfig: {
    region: 'region',
    notifyContentFormat: 'notifyContentFormat',
    notifyStrategy: 'notifyStrategy',
    filterTag: 'filterTag'
  }
};

const cdnEvents = {
  triggerType: 'cdn_events',
  triggerName: 'cdn_events',
  triggerConfig: {
    eventName: 'eventName',
    eventVersion: 'eventVersion',
    enable: true,
    notes: 'notes',
    filter: {
      domain: 'domain'
    }
  }
};

const tablestore = {
  triggerType: 'tablestore',
  triggerName: 'tablestore',
  triggerConfig: {
    instanceName: 'instanceName',
    tableName: 'tableName'
  }
};

const rds = {
  triggerType: 'rds',
  triggerName: 'rds',
  triggerConfig: {
    instanceId: 'instanceId',
    subscriptionObjects: 'subscriptionObjects',
    retry: 3,
    concurrency: 'concurrency',
    eventFormat: 'eventFormat'
  }
};

const timer = {
  triggerType: 'timer',
  triggerName: 'timer',
  triggerConfig: {
    payload: 'payload',
    cronExpression: 'cronExpression',
    enable: true
  }
};

const ossResource = {
  'Type': 'OSS',
  'Properties': {
    'InvocationRole': 'invocationRole',
    'SourceArn': 'sourceArn',
    'Qualifier': 'qualifier',
    'Events': [
      'put'
    ],
    'BucketName': 'bucketName',
    'Filter': {
      'Key': {
        'Prefix': 'prefix',
        'Suffix': 'suffix'
      }
    }
  }
};

const httpResource = {
  'Type': 'HTTP',
  'Properties': {
    'AuthType': 'function',
    'Methods': [
      'get',
      'post'
    ]
  }
};

const logResource = {
  'Type': 'Log',
  'Properties': {
    'SourceConfig': {
      'Logstore': 'logstore'
    },
    'JobConfig': {
      'MaxRetryTime': 2,
      'TriggerInterval': 60
    }
  }
};

const mnsTopicResource = {
  'Type': 'MNSTopic',
  'Properties': {
    'Region': 'region',
    'NotifyContentFormat': 'notifyContentFormat',
    'NotifyStrategy': 'notifyStrategy',
    'FilterTag': 'filterTag'
  }
};

const tablestoreResource = {
  'Type': 'TableStore',
  'Properties': {
    'InstanceName': 'instanceName',
    'TableName': 'tableName'
  }
};

const rdsResource = {
  'Type': 'RDS',
  'Properties': {
    'InstanceId': 'instanceId',
    'SubscriptionObjects': 'subscriptionObjects',
    'Retry': 3,
    'Concurrency': 'concurrency',
    'EventFormat': 'eventFormat'
  }
};

const timerResource = {
  'Type': 'Timer',
  'Properties': {
    'Payload': 'payload',
    'CronExpression': 'cronExpression',
    'Enable': true
  }
};

const cdnEventsResource = {
  'Type': 'CDN',
  'Properties': {
    'EventName': 'eventName',
    'EventVersion': 'eventVersion',
    'Notes': 'notes'
  }
};


module.exports = { 
  oss, http, log, mnsTopic, cdnEvents, rds, tablestore, timer,
  ossResource, httpResource, logResource, mnsTopicResource, cdnEventsResource, rdsResource, tablestoreResource, timerResource
};
