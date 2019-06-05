'use strict';

const customDomainResourceSchema = {
  '$id': '/Resources/CustomDomain',
  'type': 'object',
  'description': 'CustomDomain',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::CustomDomain'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Protocol': {
          'type': 'string',
          'enum': ['HTTP', 'HTTP,HTTPS']
        },
        'RouteConfig': {
          'type': 'object',
          'properties': {
            'Routes': {
              'type': 'object',
              'patternProperties': {
                '^/.*$': {
                  'anyOf': [
                    { '$ref': '/Resources/CustomDomain/PathConfig' }
                  ]
                }
              },
              'additionalProperties': false
            },
            'routes': {
              'type': 'object',
              'patternProperties': {
                '^/.*$': {
                  'anyOf': [
                    { '$ref': '/Resources/CustomDomain/PathConfig' }
                  ]
                }
              },
              'additionalProperties': false
            }
          },
          'patternRequired': [ '[Rr]outes' ],
          'additionalProperties': false
        },
        'CertConfig': {
          'type': 'object',
          'properties': {
            'CertName': {
              'type': 'string'
            },
            'PrivateKey': {
              'type': 'string'
            },
            'Certificate': {
              'type': 'string'
            }
          },
          'required': ['CertName', 'PrivateKey', 'Certificate'],
          'additionalProperties': false
        }
      },
      'required': ['Protocol', 'RouteConfig'],
      'additionalProperties': false
    }
  },
  'required': ['Type'],
  'additionalProperties': false
};

module.exports = customDomainResourceSchema;