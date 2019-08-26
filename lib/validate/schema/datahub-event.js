'use strict';

const datahubEventSchema = {
  '$id': '/Resources/Service/Function/Events/Datahub',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Datahub'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Topic': {
          'type': 'string'
        },
        'StartingPosition': {
          'type': 'string',
          'enum': ['LATEST', 'OLDEST', 'SYSTEM_TIME']
        },
        'BatchSize': {
          'type': 'integer',
          'minimum': 1
        },
        'Qualifier': {
          'type': 'string'
        }
      },
      'required': ['Topic', 'StartingPosition'],
      'additionalProperties': false
    }
  },
  'additionalProperties': false 
};

module.exports = datahubEventSchema;