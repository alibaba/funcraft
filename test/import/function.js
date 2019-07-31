'use strict';

const {
  ossResource,
  httpResource,
  logResource,
  mnsTopicResource,
  cdnEventsResource,
  rdsResource,
  tablestoreResource,
  timerResource
} = require('./trigger');

const func1 = {
  functionName: 'func1',
  description: 'description',
  initializer: 'initializer',
  initializationTimeout: 60,
  handler: 'index.handler',
  runtime: 'nodejs8',
  memorySize: 512,
  environmentVariables: {
    foo: 'bar'
  }
};

const func2 = {
  functionName: 'func2',
  description: 'description',
  initializer: 'initializer',
  initializationTimeout: 60,
  handler: 'index.handler',
  runtime: 'nodejs8',
  memorySize: 512
};

const func3 = {
  functionName: 'func3',
  handler: 'index.handler',
  runtime: 'nodejs8',
  memorySize: 512
};

const funcResource1 = {
  'Type': 'Aliyun::Serverless::Function',
  'Properties': {
    'Description': 'description',
    'Initializer': 'initializer',
    'InitializationTimeout': 60,
    'Handler': 'index.handler',
    'Runtime': 'nodejs8',
    'MemorySize': 512,
    'EnvironmentVariables': {
      'foo': 'bar'
    },
    'CodeUri': './service/func1'
  },
  'Events': {
    'oss': ossResource,
    'http': httpResource,
    'log': logResource,
    'mns_topic': mnsTopicResource,
    'cdn_events': cdnEventsResource,
    'rds': rdsResource,
    'tablestore': tablestoreResource,
    'timer': timerResource
  }
};


const funcResource2 = {
  'Type': 'Aliyun::Serverless::Function',
  'Properties': {
    'Description': 'description',
    'Initializer': 'initializer',
    'InitializationTimeout': 60,
    'Handler': 'index.handler',
    'Runtime': 'nodejs8',
    'MemorySize': 512,
    'CodeUri': './service/func2'
  }
};

const funcResource3 = {
  'Type': 'Aliyun::Serverless::Function',
  'Properties': {
    'Handler': 'index.handler',
    'Runtime': 'nodejs8',
    'MemorySize': 512,
    'CodeUri': './service/func3'
  }
};

module.exports = { func1, func2, func3, funcResource1, funcResource2, funcResource3 };
