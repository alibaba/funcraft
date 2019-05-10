'use strict';

const pathConfigResourceSchema = {
  '$id': '/Resources/CustomDomain/PathConfig',
  'type': 'object',
  'errorMessage': ' ',
  'properties': {
    'ServiceName': {
      'type': 'string',
    },
    'FunctionName': {
      'type': 'string',
    },
  },
  'additionalProperties': false,
};

module.exports = pathConfigResourceSchema;