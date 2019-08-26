'use strict';

const timerEventSchema = {
  '$id': '/Resources/Service/Function/Events/Timer',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Timer'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'InvocationRole': {
          'type': 'string'
        },
        'Payload': {
          'type': 'string'
        },
        'CronExpression': {
          'type': 'string'
        },
        'Enable': {
          'type': 'boolean'
        },
        'Qualifier': {
          'type': 'string'
        }
      },
      'required': ['CronExpression'],
      'additionalProperties': false
    }
  }
};

module.exports = timerEventSchema;