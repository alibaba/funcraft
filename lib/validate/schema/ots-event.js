'use strict';

const otsEventSchema = {
  '$id': '/Resources/Service/Function/Events/OTS',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'OTS'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Stream': {
          'type': 'string'
        }
      },
      'required': ['Stream']
    }
  }
};

module.exports = otsEventSchema;