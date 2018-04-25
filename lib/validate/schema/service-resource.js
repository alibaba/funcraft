'use strict';

const serviceResourceSchema = {
  '$id': '/Resources/Service',
  'type': 'object',
  'description': 'Service',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::Service'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Description': {
          'type': 'string'
        }
      }
    }
  },
  'patternProperties': {
    '^(?!Type|Properties)[a-zA-Z_][a-zA-Z0-9_-]{0,127}$': {
      '$ref': '/Resources/Service/Function'
    }
  },
  'required': ['Type']
};

module.exports = serviceResourceSchema;