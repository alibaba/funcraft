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
        }
      },
      'required': ['AuthType', 'Methods'],
      'additionalProperties': false
    },
  },
  'required': ['Properties'],
  'additionalProperties': false
};

module.exports = httpEventSchema;