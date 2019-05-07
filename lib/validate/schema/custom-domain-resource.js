'use strict';

const customDomainResourceSchema = {
  '$id': '/Resources/CustomDomain',
  'type': 'object',
  'description': 'CustomDomain',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::CustomDomain',
      'errorMessage' : { 'type':'','const' : '' }
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Protocol': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
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
          }
        }
      },
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'additionalProperties' : ''
      }
    }
  },
  'required': ['Type'],
  'additionalProperties': false,
  'errorMessage' : {
    'type' : '',
    'required' : '',
    'additionalProperties' : ''
  }
};

module.exports = customDomainResourceSchema;