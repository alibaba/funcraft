'use strict';

const httpEventSchema = {
  '$id': '/Resources/Service/Function/Events/Http',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'HTTP',
      'errorMessage' : { 'type':'','const' : '' }
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'AuthType': {
          'type': 'string',
          'enum': ['ANONYMOUS', 'FUNCTION', 'anonymous', 'function'],
          'errorMessage' : { 'type':'','enum' : '' }
        },
        'Methods': {
          'errorMessage' : { 'type':'' },
          'type': 'array',
          'items': {
            'type': 'string',
            'enum': ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
            'errorMessage' : { 'type':'','enum' : '' }
          }
        }
      },
      'required': ['AuthType', 'Methods'],
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'required' : '',
        'additionalProperties' : ''
      }
    },
  },
  'required': ['Properties'],
  'additionalProperties': false,
  'errorMessage' : {
    'type' : '',
    'required' : '',
    'additionalProperties' : ''
  }
};

module.exports = httpEventSchema;