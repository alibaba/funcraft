'use strict';

const pathConfigResourceSchema = {
  '$id': '/Resources/CustomDomain/PathConfig',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'errorMessage' : { 'type':'' }
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'ServiceName': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        },
        'FunctionName': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        }
      },
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'additionalProperties' : ''
      }
    }
  },
  'additionalProperties': false,
  'errorMessage' : {
    'type' : '',
    'additionalProperties' : ''
  }
};

module.exports = pathConfigResourceSchema;