'use strict';

const otsResourceSchema = {
  '$id': '/Resources/TableStore',
  'type': 'object',
  'description': 'TableStore',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::TableStore',
      'errorMessage' : {'type':'','const':''}
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'ClusterType': {
          'type': 'string',
          'enum': ['HYBRID', 'SSD'],
          'errorMessage' : {'type':'','enum':''}
        },
        'Description': {
          'type': 'string',
          'errorMessage' : {'type':''}
        }
      },
      'required': ['ClusterType', 'Description'],
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'required' : '',
        'additionalProperties' : ''
      }
    },
  },
  'patternProperties': {
    '^(?!Type|Properties)[a-zA-Z_][a-zA-Z0-9_]{0,127}$': {
      '$ref': '/Resources/TableStore/Table'
    }
  },
  'required': ['Type', 'Properties'],
  'additionalProperties': false,
  'errorMessage' : {
    'type' : '',
    'required' : '',
    'additionalProperties' : ''
  }
};

module.exports = otsResourceSchema;