'use strict';

const pathConfigResourceSchema = {
  '$id': '/Resources/CustomDomain/PathConfig',
  'type': 'object',
  'properties': {
    'serviceName': {
      'type': 'string'
    },
    'ServiceName': {
      'type': 'string'
    },
    'functionName': {
      'type': 'string'
    },
    'FunctionName': {
      'type': 'string'
    }
  },
  'patternRequired': ['[Ss]erviceName', '[Ff]unctionName'],
  'additionalProperties': false
};

module.exports = pathConfigResourceSchema;