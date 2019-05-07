'use strict';

const timerEventSchema = {
  '$id': '/Resources/Service/Function/Events/Timer',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Timer',
      'errorMessage' : { 'type':'','const' : '' }
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Payload': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        },
        'CronExpression': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        },
        'Enable': {
          'type': 'boolean',
          'errorMessage' : { 'type':'' }
        },
      },
      'required': ['CronExpression'],
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'required' : '',
        'additionalProperties' : ''
      }
    }
  }
};

module.exports = timerEventSchema;