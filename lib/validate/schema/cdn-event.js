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
        'eventName': {
          'type': 'string'
        },
        'eventVersion': {
          'type': 'string'
        },
        'notes': {
          'type': 'string'
        },
        'filter': {
          'type': 'object',
          'properties': {
            'domain': {
              'type': 'array',
              'items': {
                'type': 'string',
              }
            }
          },
          'required': ['domain'],
          'additionalProperties': false
        }
      },
      'required': ['eventName','eventVersion','notes','filter'],
      'additionalProperties': false
    },
  },
  'required': ['Properties','Type'],
  'additionalProperties': false
};
module.exports = cdnEventSchema;