'use strict';

const mnsTopicResourceSchema = {
  '$id': '/Resources/MNSTopic',
  'type': 'object',
  'description': 'MNS Topic resource',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::MNSTopic'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Region': {
          'type': 'string'
        },
        'MaximumMessageSize': {
          'type': 'integer'
        },
        'LoggingEnabled': {
          'type': 'boolean'
        }
      },
      'required': ['Region'],
      'additionalProperties': false
    }
  },
  'required': ['Type', 'Properties'],
  'additionalProperties': false
};


module.exports = mnsTopicResourceSchema;