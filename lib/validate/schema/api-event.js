'use strict';

const apiEventSchema = {
  '$id': '/Resources/Service/Function/Events/API',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Api',
      'errorMessage' : {'type':'','const':''}
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Path': {
          'type': 'string',
          'errorMessage' : {'type':''}
        },
        'Method': {
          'type': 'string',
          'enum': ['get', 'head', 'post', 'put', 'delete', 'connect', 'options', 'trace', 'patch',
            'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH',
            'Get', 'Head', 'Post', 'Put', 'Delete', 'Connect', 'Options', 'Trace', 'Patch'
          ],
          'errorMessage' : {'type':'','enum':''}
        },
        'RestApiId': {
          'oneOf': [
            { 'type': 'string', 'errorMessage' : {'type':''} },
            {
              'type': 'object',
              'properties': {
                'Ref': { 'type': 'string','errorMessage' : {'type':''} }
              }
            }
          ]

        }
      },
      'required': ['Path', 'Method'],
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

module.exports = apiEventSchema;