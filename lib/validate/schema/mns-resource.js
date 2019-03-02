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
        },
      },
      'required': ['Region']
    },
  },
  'required': ['Type', 'Properties']
};


module.exports = mnsTopicResourceSchema;