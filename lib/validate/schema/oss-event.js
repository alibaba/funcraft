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
        'bucketName': {
          'type': 'string'
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
              },
              'required': ['prefix','suffix'],
              'additionalProperties': false
            }
          },
          'required': ['key'],
          'additionalProperties': false
        }
      },
      'required': ['events','bucketName','filter'],
      'additionalProperties': false
    },
  },
  'required': ['Properties','Type'],
  'additionalProperties': false
};
module.exports = ossEventSchema;