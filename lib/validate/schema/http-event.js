'use strict';

const httpEventSchema = {
  '$id': '/Resources/Service/Function/Events/Http',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'HTTP'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'InvocationRole': {
          'type': 'string'
        },
        'AuthType': {
          'type': 'string',
          'enum': ['ANONYMOUS', 'FUNCTION', 'anonymous', 'function']
        },
        'Methods': {
          'type': 'array',
          'items': {
            'type': 'string',
            'enum': ['GET', 'POST', 'PUT', 'DELETE', 'HEAD']
          }
        },
        'Qualifier': {
          'type': 'string'
        }
      },
      'required': ['AuthType', 'Methods'],
      'additionalProperties': false
    }
  },
  'required': ['Properties'],
  'additionalProperties': false
};

module.exports = httpEventSchema;