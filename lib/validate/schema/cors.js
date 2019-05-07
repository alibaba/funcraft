'use strict';

const corsSchema = {
  '$id': '/CORS',
  'type': 'object',
  'properties': {
    'AllowMethods': {
      'type': 'string',
      'errorMessage' : {'type':''}
    },
    'AllowHeaders': {
      'type': 'string',
      'errorMessage' : {'type':''}
    },
    'AllowOrigin': {
      'type': 'string',
      'errorMessage' : {'type':''}
    },
    'MaxAge': {
      'type': 'string',
      'errorMessage' : {'type':''}
    }
  },
  'required': ['AllowOrigin'],
  'additionalProperties': false,
  'errorMessage' : {
    'type' : '',
    'required' : '',
    'additionalProperties' : ''
  }
};

module.exports = corsSchema;