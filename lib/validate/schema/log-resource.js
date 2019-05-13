'use strict';

const logResourceSchema = {
  '$id': '/Resources/Log',
  'type': 'object',
  'description': 'Log Service',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::Log'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Description': {
          'type': 'string'
        }
      },
      'required': ['Description'],
      'additionalProperties': false
    }
  },
  'patternProperties': {
    '^(?!Type|Properties)[a-zA-Z][a-zA-Z0-9-]{0,127}$': {
      anyOf: [
        { '$ref': '/Resources/Log/Logstore' }
      ]
    }
  },

  'required': ['Type', 'Properties'],
  'additionalProperties': false
};

module.exports = logResourceSchema;