'use strict';

const logEventSchema = {
  '$id': '/Resources/Service/Function/Events/Log',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Log',
      'errorMessage' : { 'type':'','const' : '' }
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'SourceConfig': {
          'type': 'object',
          'properties': {
            'Logstore': {
              'type': 'string',
              'errorMessage' : { 'type':'' }
            }
          },
          'required': ['Logstore'],
          'additionalProperties': false,
          'errorMessage' : {
            'type' : '',
            'required' : '',
            'additionalProperties' : ''
          }
        },
        'JobConfig': {
          'type': 'object',
          'properties': {
            'MaxRetryTime': {
              'type': 'number',
              'errorMessage' : { 'type':'' }
            },
            'TriggerInterval': {
              'type': 'number',
              'errorMessage' : { 'type':'' }
            }
          },
          'required': ['MaxRetryTime', 'TriggerInterval'],
          'additionalProperties': false,
          'errorMessage' : {
            'type' : '',
            'required' : '',
            'additionalProperties' : ''
          }
        },
        'LogConfig': {
          'type': 'object',
          'properties': {
            'Project': {
              'type': 'string',
              'errorMessage' : { 'type':'' }
            },
            'Logstore': {
              'type': 'string',
              'errorMessage' : { 'type':'' }
            },
            'FunctionParameter': {
              'type': 'object',
              'errorMessage' : { 'type':'' }
            }
          },
          'required': ['Project', 'Logstore'],
          'additionalProperties': false,
          'errorMessage' : {
            'type' : '',
            'required' : '',
            'additionalProperties' : ''
          }
        },
        'Enable': { 'type': 'boolean','errorMessage' : { 'type':'' } }
      },
      'required': ['SourceConfig', 'JobConfig', 'LogConfig'],
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'required' : '',
        'additionalProperties' : ''
      }
    }
  },
  'required': ['Type', 'Properties'],
  'additionalProperties': false,
  'errorMessage' : {
    'type' : '',
    'required' : '',
    'additionalProperties' : ''
  }
};

module.exports = logEventSchema;