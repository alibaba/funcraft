'use strict';

const functionSchema = {
  '$id': '/Resources/Service/Function',
  'type': 'object',
  'description': 'Function',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::Function',
      'errorMessage' :{
        'const' : ''
      }
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Handler': {
          'type': 'string',
          'errorMessage' : {'type':''}
        },
        'Initializer': {
          'type': 'string',
          'errorMessage' : {'type':''}
        },
        'Runtime': {
          'type': 'string',
          'enum': ['nodejs6', 'nodejs8', 'python2.7', 'python3', 'java8', 'php7.2'],
          'errorMessage': {
            'type':'',
            'enum':''
          }
        },
        'CodeUri': {
          'type': 'string',
          'errorMessage' : {'type':''}
        },
        'Description': {
          'type': 'string',
          'errorMessage' : {'type':''}
        },
        'Timeout': {
          'type': 'integer',
          'errorMessage' : {'type':''}
        },
        'InitializationTimeout': {
          'type': 'integer',
          'errorMessage' : {'type':''}
        },
        'EnvironmentVariables': {
          'type': 'object',
          'errorMessage' : {'type':''}
        },
        'MemorySize': {
          'type': 'integer',
          'errorMessage' : {'type':''}
        }
      },
      'required': ['Handler', 'Runtime', 'CodeUri'],
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'required' : '',
        'additionalProperties' : ''
      }
    },
    'Events': {
      'type': 'object',
      'patternProperties': {
        '^[a-zA-Z_][a-zA-Z0-9_-]{0,127}$': {
          'anyOf': [
            { '$ref': '/Resources/Service/Function/Events/Datahub' },
            { '$ref': '/Resources/Service/Function/Events/API' },
            { '$ref': '/Resources/Service/Function/Events/TableStore' },
            { '$ref': '/Resources/Service/Function/Events/Timer' },
            { '$ref': '/Resources/Service/Function/Events/Http'},
            { '$ref': '/Resources/Service/Function/Events/Log'},
            { '$ref': '/Resources/Service/Function/Events/RDS'},
            { '$ref': '/Resources/Service/Function/Events/MNSTopic'},
            { '$ref': '/Resources/Service/Function/Events/OSS'},
            { '$ref': '/Resources/Service/Function/Events/CDN'}
          ]
        }
      }
    },
  },
  'required': ['Type'],
  'additionalProperties': false
};
module.exports = functionSchema;
