'use strict';

const apiRescoureSchema = {
  '$id': '/Resources/Api',
  'type': 'object',
  'description': 'API',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::Api',
      'errorMessage' : {'type':'','enum':''}
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Name': {
          'type': 'string',
          'errorMessage' : {'type':''}
        },
        'StageName': {
          'type': 'string',
          'errorMessage' : {'type':''}
        },
        'DefinitionBody': {
          'type': 'object',
          'errorMessage' : {'type':''}
        },
        'DefinitionUri': {
          'type': 'string',
          'errorMessage' : {'type':''}
        },
        'Cors': {
          oneOf: [
            { 'type': 'string','errorMessage' : {'type':''} },
            { '$ref': '/CORS' }
          ]
        }
      },
      'required': ['StageName'],
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'required' : '',
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

module.exports = apiRescoureSchema;