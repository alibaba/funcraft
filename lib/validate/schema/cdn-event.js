'use strict';

const cdnEventSchema = {
  '$id': '/Resources/Service/Function/Events/CDN',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'CDN',
      'errorMessage' : { 'type':'','const' : '' }
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'EventName': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        },
        'EventVersion': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        },
        'Notes': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        },
        'Filter': {
          'type': 'object',
          'properties': {
            'Domain': {
              'errorMessage' : { 'type':'' },
              'type': 'array',
              'items': {
                'type': 'string',
                'errorMessage' : { 'type':'' }
              }
            }
          },
          'required': ['Domain'],
          'additionalProperties': false,
          'errorMessage' : {
            'type' : '',
            'required' : '',
            'additionalProperties' : ''
          }
        }
      },
      'required': ['EventName','EventVersion','Notes','Filter'],
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'required' : '',
        'additionalProperties' : ''
      }
    },
  },
  'required': ['Properties','Type'],
  'additionalProperties': false,
  'errorMessage' : {
    'type' : '',
    'required' : '',
    'additionalProperties' : ''
  }
};
module.exports = cdnEventSchema;