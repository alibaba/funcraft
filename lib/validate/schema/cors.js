'use strict';

const corsSchema = {
  '$id': '/CORS',
  'type': 'object',
  'properties': {
    'AllowMethods': {
      'type': 'string'
    },
    'AllowHeaders': {
      'type': 'string'
    },
    'AllowOrigin': {
      'type': 'string'
    },
    'MaxAge': {
      'type': 'string'
    }
  },
  'required': ['AllowOrigin'],
  'additionalProperties': false
};

module.exports = corsSchema;