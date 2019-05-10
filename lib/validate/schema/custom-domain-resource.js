'use strict';

const customDomainResourceSchema = {
  '$id': '/Resources/CustomDomain',
  'type': 'object',
  'description': 'CustomDomain',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::CustomDomain',
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Protocol': {
          'type': 'string',
        },
        'RouteConfig': {
          'type': 'object',
          'properties': {
            'Routes': {
              'type': 'object',
              'patternProperties': {
                '^/': {
                  'anyOf': [
                    { '$ref': '/Resources/CustomDomain/PathConfig' }
                  ]
                }
              }
            }
          },
          'additionalProperties': false
        }
      },
      'additionalProperties': false,
    }
  },
  'required': ['Type'],
  'additionalProperties': false,
};

module.exports = customDomainResourceSchema;