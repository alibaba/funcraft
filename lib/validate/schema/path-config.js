'use strict';

const pathConfigResourceSchema = {
  '$id': '/Resources/CustomDomain/PathConfig',
  'type': 'object',
  'properties': {
    'ServiceName': {
      'type': 'string',
    },
    'FunctionName': {
      'type': 'string',
    },
  },
  'additionalProperties': false
};

module.exports = pathConfigResourceSchema;