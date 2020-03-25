'use strict';

const logstoreSchema = {
  '$id': '/Resources/Log/Logstore',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::Log::Logstore'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'TTL': {
          'type': 'integer'
        },
        'ShardCount': {
          'type': 'integer'
        }
      },
      'required': ['TTL', 'ShardCount'],
      'additionalProperties': false
    }
  },
  'required': ['Type', 'Properties'],
  'additionalProperties': false
};

module.exports = logstoreSchema;