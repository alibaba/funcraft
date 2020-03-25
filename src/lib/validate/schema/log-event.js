'use strict';

const logEventSchema = {
  '$id': '/Resources/Service/Function/Events/Log',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Log'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'InvocationRole': {
          'type': 'string'
        },
        'SourceConfig': {
          'type': 'object',
          'properties': {
            'Logstore': {
              'type': 'string'
            }
          },
          'required': ['Logstore'],
          'additionalProperties': false
        },
        'JobConfig': {
          'type': 'object',
          'properties': {
            'MaxRetryTime': {
              'type': 'number'
            },
            'TriggerInterval': {
              'type': 'number'
            }
          },
          'required': ['MaxRetryTime', 'TriggerInterval'],
          'additionalProperties': false
        },
        'LogConfig': {
          'type': 'object',
          'properties': {
            'Project': {
              'type': 'string'
            },
            'Logstore': {
              'type': 'string'
            },
            'FunctionParameter': {
              'type': 'object'
            }
          },
          'required': ['Project', 'Logstore'],
          'additionalProperties': false
        },
        'Enable': { 'type': 'boolean' },
        'Qualifier': {
          'type': 'string'
        }
      },
      'required': ['SourceConfig', 'JobConfig', 'LogConfig'],
      'additionalProperties': false
    }
  },
  'required': ['Type', 'Properties'],
  'additionalProperties': false
};

module.exports = logEventSchema;