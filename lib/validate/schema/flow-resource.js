'use strict';

const flowResourceSchema = {
  '$id': '/Resources/Flow',
  'type': 'object',
  'description': 'Flow',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::Flow'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Description': {
          'type': 'string'
        },
        'Role': {
          'type': 'string'
        },
        'Policies': {
          oneOf: [
            { 'type': 'string' },
            { '$ref': '/Resources/Service/Role' },
            {
              'type': 'array',
              'items': {
                oneOf: [
                  { 'type': 'string' },
                  { '$ref': '/Resources/Service/Role' }
                ]
              }
            }
          ]
        },
        'DefinitionUri': {
          'type': 'string'
        }
      },
      'additionalProperties': false,
      'required': ['Description', 'DefinitionUri']
    }
  },
  'additionalProperties': false,
  'required': ['Type', 'Properties']
};

module.exports = flowResourceSchema;