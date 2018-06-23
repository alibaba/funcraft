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
      'required': ['TTL', 'ShardCount']
    }
  },

  'required': ['Type', 'Properties']
};

module.exports = logstoreSchema;