'use strict';

const pathConfigResourceSchema = {
  '$id': '/Resources/CustomDomain/PathConfig',
  'type': 'object',
  'errorMessage': ' ',
  'properties': {
    'Type': {
      'type': 'string',
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'ServiceName': {
          'type': 'string',
        },
        'FunctionName': {
          'type': 'string',
        }
      },
      'additionalProperties': false,
    }
  },
  'additionalProperties': false,
};

module.exports = pathConfigResourceSchema;