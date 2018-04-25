'use strict';

const rosSchema = {
  '$id': '/',
  'title': 'fun template',
  'type': 'object',
  'properties': {
    'ROSTemplateFormatVersion': {
      'type': 'string',
      'enum': ['2015-09-01']
    },
    'Transform': {
      'type': 'string',
      'enum': ['Aliyun::Serverless-2018-04-03']
    },
    'Resources': {
      'type': 'object',
      'patternProperties': {
        '^[a-zA-Z_][a-zA-Z0-9_-]{0,127}$': {
          anyOf: [
            { '$ref': '/Resources/Service' },
            { '$ref': '/Resources/Api' }
          ]
        }
      }
    }
  },
  'required': ['ROSTemplateFormatVersion', 'Resources']
};

module.exports = rosSchema;