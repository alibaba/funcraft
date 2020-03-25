'use strict';

const tableStoreEventSchema = {
  '$id': '/Resources/Service/Function/Events/TableStore',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'TableStore'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'InvocationRole': {
          'type': 'string'
        },
        'InstanceName': {
          'type': 'string'
        },
        'TableName': {
          'type': 'string'
        },
        'Qualifier': {
          'type': 'string'
        }
      },
      'required': ['InstanceName', 'TableName'],
      'additionalProperties': false
    }
  },
  'required': ['Properties'],
  'additionalProperties': false
};

module.exports = tableStoreEventSchema;