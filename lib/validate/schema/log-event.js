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
        'SourceConfig': {
          'type': 'object',
          'properties': {
            'Logstore': {
              'type': 'string'
            }
          },
          'required': ['Logstore']
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
          'required': ['MaxRetryTime', 'TriggerInterval']
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
          'required': ['Project', 'Logstore']
        },
        'Enabled': { 'type': 'boolean' }
      },
      'required': ['SourceConfig', 'JobConfig', 'LogConfig']
    }
  },
  'required': ['Type', 'Properties']
};

module.exports = logEventSchema;