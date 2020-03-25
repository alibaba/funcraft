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
        'InvocationRole': {
          'type': 'string'
        },
        'events': {
          'type': 'array',
          'items': {
            'type': 'string'
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
                }
              },
              'required': ['prefix', 'suffix'],
              'additionalProperties': false
            }
          },
          'required': ['key'],
          'additionalProperties': false
        },
        'qualifier': {
          'type': 'string'
        },
        'Events': {
          'type': 'array',
          'items': {
            'type': 'string'
          }
        },
        'BucketName': {
          'type': 'string'
        },
        'Filter': {
          'type': 'object',
          'properties': {
            'Key': {
              'type': 'object',
              'properties': {
                'Prefix': {
                  'type': 'string'
                },
                'Suffix': {
                  'type': 'string'
                }
              },
              'required': ['Prefix', 'Suffix'],
              'additionalProperties': false
            }
          },
          'required': ['Key'],
          'additionalProperties': false
        },
        'Qualifier': {
          'type': 'string'
        }
      },
      'patternRequired': ['[Ee]vents', '[Bb]ucketName', '[Ff]ilter'], //为了兼容 #192 这个 pr 定义的 oss trigger 首字母小写的 schama
      'additionalProperties': false
    }
  },
  'required': ['Properties', 'Type'],
  'additionalProperties': false
};
module.exports = ossEventSchema;