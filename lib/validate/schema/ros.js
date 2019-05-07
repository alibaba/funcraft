'use strict';

const rosSchema = {
  '$id': '/ROS',
  'title': 'fun template',
  'type': 'object',
  'properties': {
    'ROSTemplateFormatVersion': {
      'type': 'string',
      'enum': ['2015-09-01'],
      'errorMessage' : {'type':'','enum':''}
    },
    'Transform': {
      'type': 'string',
      'enum': ['Aliyun::Serverless-2018-04-03'],
      'errorMessage' : {'type':'','enum':''}
    },
    'Resources': {
      'type': 'object',
      'patternProperties': {
        '^[a-zA-Z_][a-zA-Z.0-9_-]{0,127}$': {
          "if": {
            "properties": {
              "Type": {
                'type': 'string',
                'const': 'Aliyun::Serverless::Service',
              }
            }
          },
          "then": { "$ref": "/Resources/Service" },
          "else": {
            "if": {
              "properties": {
                "Type": {
                  'type': 'string',
                  'const': 'Aliyun::Serverless::TableStore',
                }
              }
            },
            "then": { "$ref": "/Resources/TableStore" },
            "else": false
          }

          // { '$ref': '/Resources/Service' },
          // { '$ref': '/Resources/Api' },
          // { '$ref': '/Resources/TableStore' },
          // { '$ref': '/Resources/Log' },
          // { '$ref': '/Resources/CustomDomain'},
          // { '$ref': '/Resources/MNSTopic'}
        }
      }
    }
  },
  'required': ['ROSTemplateFormatVersion', 'Resources'],
  'additionalProperties': false,
  'errorMessage' : {
    'type' : '',
    'required' : '',
    'additionalProperties' : ''
  }
};

module.exports = rosSchema;