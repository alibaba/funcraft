'use strict';

const ossEventSchema = {
  '$id': '/Resources/Service/Function/Events/OSS',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'OSS',
      'errorMessage' : { 'type':'','const' : '' }
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'events': {
          'errorMessage' : { 'type':'' },
          'type': 'array',
          'items': {
            'type': 'string',
            'errorMessage' : { 'type':'' }
          }
        },
        'bucketName': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        },
        'filter': {
          'type': 'object',
          'properties': {
            'key': {
              'type': 'object',
              'properties': {
                'prefix': {
                  'type': 'string',
                  'errorMessage' : { 'type':'' }
                },
                'suffix': {
                  'type': 'string',
                  'errorMessage' : { 'type':'' }
                },
              },
              'required': ['prefix','suffix'],
              'additionalProperties': false,
              'errorMessage' : {
                'type' : '',
                'required' : '',
                'additionalProperties' : ''
              }
            }
          },
          'required': ['key'],
          'additionalProperties': false,
          'errorMessage' : {
            'type' : '',
            'required' : '',
            'additionalProperties' : ''
          }
        },
        'Events': {
          'errorMessage' : { 'type':'' },
          'type': 'array',
          'items': {
            'type': 'string',
            'errorMessage' : { 'type':'' }
          }
        },
        'BucketName': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        },
        'Filter': {
          'type': 'object',
          'properties': {
            'Key': {
              'type': 'object',
              'properties': {
                'Prefix': {
                  'type': 'string',
                  'errorMessage' : { 'type':'' }
                },
                'Suffix': {
                  'type': 'string',
                  'errorMessage' : { 'type':'' }
                },
              },
              'required': ['Prefix','Suffix'],
              'additionalProperties': false,
              'errorMessage' : {
                'type' : '',
                'required' : '',
                'additionalProperties' : ''
              }
            }
          },
          'required': ['Key'],
          'additionalProperties': false,
          'errorMessage' : {
            'type' : '',
            'required' : '',
            'additionalProperties' : ''
          }
        }
      },
      'patternRequired': ['[Ee]vents','[Bb]ucketName','[Ff]ilter'],//为了兼容 #192 这个 pr 定义的 oss trigger 首字母小写的 schama
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
module.exports = ossEventSchema;