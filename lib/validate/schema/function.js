'use strict';

const functionSchema = {
  '$id': '/Resources/Service/Function',
  'type': 'object',
  'description': 'Function',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::Function'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Handler': {
          'type': 'string'
        },
        'Initializer': {
          'type': 'string'
        },
        'Runtime': {
          'type': 'string',
          'enum': ['nodejs6', 'nodejs8', 'python2.7', 'python3', 'java8', 'php7.2'],
        },
        'CodeUri': {
          'type': 'string'
        },
        'Description': {
          'type': 'string'
        },
        'Timeout': {
          'type': 'integer'
        },
        'InitializationTimeout': {
          'type': 'integer'
        },
        'EnvironmentVariables': {
          'type': 'object'
        },
        'MemorySize': {
          'type': 'integer'
        }
      },
      'required': ['Handler', 'Runtime', 'CodeUri'],
      'additionalProperties': false
    },
    'Events': {
      'type': 'object',
      'patternProperties': {
        '^[a-zA-Z_][a-zA-Z0-9_-]{0,127}$': {
          'anyOf': [
            { '$ref': '/Resources/Service/Function/Events/Datahub' },
            { '$ref': '/Resources/Service/Function/Events/API' },
            { '$ref': '/Resources/Service/Function/Events/OTS' },
            { '$ref': '/Resources/Service/Function/Events/Timer' },
            { '$ref': '/Resources/Service/Function/Events/Http'},
            { '$ref': '/Resources/Service/Function/Events/Log'}
          ]
        }
      }
    },
  },
  'required': ['Type'],
};
module.exports = functionSchema;
