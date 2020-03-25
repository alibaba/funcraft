'use strict';

const apiEventSchema = {
  '$id': '/Resources/Service/Function/Events/API',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Api'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Path': {
          'type': 'string'
        },
        'Method': {
          'type': 'string',
          'enum': ['get', 'head', 'post', 'put', 'delete', 'connect', 'options', 'trace', 'patch',
            'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH',
            'Get', 'Head', 'Post', 'Put', 'Delete', 'Connect', 'Options', 'Trace', 'Patch'
          ]
        },
        'RestApiId': {
          'oneOf': [
            { 'type': 'string' },
            {
              'type': 'object',
              'properties': {
                'Ref': { 'type': 'string' }
              }
            }
          ]

        },
        'Qualifier': {
          'type': 'string'
        }
      },
      'required': ['Path', 'Method'],
      'additionalProperties': false
    }
  },
  'required': ['Type'],
  'additionalProperties': false
};

module.exports = apiEventSchema;