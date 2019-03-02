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
        'InstanceName': {
          'type': 'string'
        },
        'TableName': {
          'type': 'string'
        }
      },
      'required': ['InstanceName', 'TableName']
    }
  },
  'required': ['Properties']
};

module.exports = tableStoreEventSchema;