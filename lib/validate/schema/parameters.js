'use strict';

const parametersSchema = {
  '$id': '/Parameters',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'enum': [
        'String',
        'Number',
        'CommaDelimitedList',
        'Json',
        'Boolean'
      ]
    }
  },
  'required': ['Type'],
  'additionalProperties': true
};

module.exports = parametersSchema;