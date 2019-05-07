'use strict';

const rdsEventSchema = {
  '$id': '/Resources/Service/Function/Events/RDS',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'RDS',
      'errorMessage' : { 'type' : '','const' : '' }
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'InstanceId': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        },
        'SubscriptionObjects': {
          'errorMessage' : { 'type':'' },
          'type': 'array',
          'items': {
            'type': 'string',
            'errorMessage' : { 'type':'' }
          }
        },
        'Retry': {
          'type': 'integer',
          'enum': [0, 1, 2, 3],
          'errorMessage' : { 'type':'','enum' : '' }
        },
        'Concurrency': {
          'type': 'integer',
          'enum': [1, 2, 3, 4, 5],
          'errorMessage' : { 'type':'','enum' : '' }
        },
        'EventFormat': {
          'type': 'string',
          'enum': ['protobuf', 'json', 'sql'],
          'errorMessage' : { 'type':'','enum' : '' }
        },
      },
      'required': ['SubscriptionObjects'],
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

module.exports = rdsEventSchema;