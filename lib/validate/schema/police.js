'use strict';

const policySchema = {
  '$id': '/Resources/Service/Role',
  'type': 'object',
  'properties': {
    'Version': { 
      'type': 'string',
      'errorMessage' : { 'type':'' }
    },
    'Statement': {
      'errorMessage' : { 'type':'' },
      'type': 'array',
      'items': {
        'type': 'object',
        'properties': {
          'Effect': {
            'type': 'string',
            'errorMessage' : { 'type':'' }
          },
          'Action': {
            'errorMessage' : { 'type':'' },
            'type': 'array',
            'items': { 'type': 'string','errorMessage' : { 'type':'' } }
          },
          'Resource': {
            'type': 'string',
            'errorMessage' : { 'type':'' }
          }
        },
        'required': ['Effect', 'Action', 'Resource'],
        'additionalProperties': false,
        'errorMessage' : {
          'type' : '',
          'required' : '',
          'additionalProperties' : ''
        }
      },
    }
  },
  'required': ['Version', 'Statement'],
  'additionalProperties': false,
  'errorMessage' : {
    'type' : '',
    'required' : '',
    'additionalProperties' : ''
  }
};

module.exports = policySchema;