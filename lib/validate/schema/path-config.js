'use strict';

const pathConfigResourceSchema = {
  '$id': '/Resources/CustomDomain/PathConfig',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'ServiceName': {
          'type': 'string'
        },
        'FunctionName': {
          'type': 'string'
        }
      }
    }
  }
};

module.exports = pathConfigResourceSchema;