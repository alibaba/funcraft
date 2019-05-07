'use strict';

const logResourceSchema = {
  '$id': '/Resources/Log',
  'type': 'object',
  'description': 'Log Service',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::Log',
      'errorMessage' : { 'type':'','const' : '' }
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Description': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        },
      },
      'required': ['Description'],
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'required' : '',
        'additionalProperties' : ''
      }
    },
  },
  'patternProperties': {
    '^(?!Type|Properties)[a-zA-Z][a-zA-Z0-9-]{0,127}$': {
      anyOf: [
        { '$ref': '/Resources/Log/Logstore' }
      ]
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

module.exports = logResourceSchema;