'use strict';

const apiRescoureSchema = {
  '$id': '/Resources/Api',
  'type': 'object',
  'description': 'API',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::Api'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Name': {
          'type': 'string'
        },
        'DefinitionBody': {
          'type': 'object'
        },
        'DefinitionUri': {
          'type': 'string'
        },
        'Cors': {
          oneOf: [
            { 'type': 'string' },
            { '$ref': '/CORS' }
          ]

        }
      }
    }
  },
  'required': ['Type']
};

module.exports = apiRescoureSchema;