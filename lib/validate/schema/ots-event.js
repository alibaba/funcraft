'use strict';

const tableStoreEventSchema = {
  '$id': '/Resources/Service/Function/Events/TableStore',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'TableStore',
      'errorMessage' : { 'type':'','const' : '' }
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'InstanceName': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        },
        'TableName': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        }
      },
      'required': ['InstanceName', 'TableName'],
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'required' : '',
        'additionalProperties' : ''
      }
    }
  },
  'required': ['Properties'],
  'additionalProperties': false,
  'errorMessage' : {
    'type' : '',
    'required' : '',
    'additionalProperties' : ''
  }
};

module.exports = tableStoreEventSchema;