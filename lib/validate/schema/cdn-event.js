'use strict';

const cdnEventSchema = {
  '$id': '/Resources/Service/Function/Events/CDN',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'CDN'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'EventName': {
          'type': 'string'
        },
        'EventVersion': {
          'type': 'string'
        },
        'Notes': {
          'type': 'string'
        },
        'Filter': {
          'type': 'object',
          'properties': {
            'Domain': {
              'type': 'array',
              'items': {
                'type': 'string',
              }
            }
          },
          'required': ['Domain'],
          'additionalProperties': false
        }
      },
      'required': ['EventName','EventVersion','Notes','Filter'],
      'additionalProperties': false
    },
  },
  'required': ['Properties','Type'],
  'additionalProperties': false
};
module.exports = cdnEventSchema;