'use strict';

const ossEventSchema = {
  '$id': '/Resources/Service/Function/Events/OSS',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'OSS'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'events': {
          'type': 'array',
          'items': {
            'type': 'string',
          }
        },
        'filter': {
          'type': 'object',
          'properties': {
            'key': {
              'type': 'object',
              'properties': {
                'prefix': {
                  'type': 'string'
                },
                'suffix': {
                  'type': 'string'
                },
              }
            }
          }
        }
      },
      'required': ['events'],
      'additionalProperties': false
    },
  },
  'required': ['Properties'],
  'additionalProperties': false
};
module.exports = ossEventSchema;