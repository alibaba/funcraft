'use strict';

const datahubEventSchema = {
  '$id': '/Resources/Service/Function/Events/Datahub',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Datahub',
      'errorMessage' :{'type':'','const' : ''}
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Topic': {
          'type': 'string',
          'errorMessage' :{'type':''}
        },
        'StartingPosition': {
          'type': 'string',
          'enum': ['LATEST', 'OLDEST', 'SYSTEM_TIME'],
          'errorMessage' :{'type':'','enum' : ''}
        },
        'BatchSize': {
          'type': 'integer',
          'minimum': 1,
          'errorMessage' :{'type':'','minimum' : ''}
        }
      },
      'required': ['Topic', 'StartingPosition'],
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'required' : '',
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

module.exports = datahubEventSchema;