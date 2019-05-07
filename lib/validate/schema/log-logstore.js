'use strict';

const logstoreSchema = {
  '$id': '/Resources/Log/Logstore',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::Log::Logstore',
      'errorMessage' : { 'type':'','const' : '' }
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'TTL': {
          'type': 'integer',
          'errorMessage' : { 'type':'' }
        },
        'ShardCount': {
          'type': 'integer',
          'errorMessage' : { 'type':'' }
        }
      },
      'required': ['TTL', 'ShardCount'],
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'required' : '',
        'additionalProperties' : ''
      }
    }
  },
  'required': ['Type', 'Properties'],
  'additionalProperties': false,
  'errorMessage' : {
    'type' : '',
    'required' : '',
    'additionalProperties' : ''
  }
};

module.exports = logstoreSchema;