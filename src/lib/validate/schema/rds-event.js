'use strict';

const rdsEventSchema = {
  '$id': '/Resources/Service/Function/Events/RDS',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'RDS'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'InvocationRole': {
          'type': 'string'
        },
        'InstanceId': {
          'type': 'string'
        },
        'SubscriptionObjects': {
          'type': 'array',
          'items': {
            'type': 'string'
          }
        },
        'Retry': {
          'type': 'integer',
          'enum': [0, 1, 2, 3]
        },
        'Concurrency': {
          'type': 'integer',
          'enum': [1, 2, 3, 4, 5]
        },
        'EventFormat': {
          'type': 'string',
          'enum': ['protobuf', 'json', 'sql']
        },
        'Qualifier': {
          'type': 'string'
        }
      },
      'required': ['SubscriptionObjects'],
      'additionalProperties': false
    }
  },
  'required': ['Properties'],
  'additionalProperties': false
};

module.exports = rdsEventSchema;