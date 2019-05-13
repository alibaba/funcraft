'use strict';

const otsResourceSchema = {
  '$id': '/Resources/TableStore',
  'type': 'object',
  'description': 'TableStore',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::TableStore'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'ClusterType': {
          'type': 'string',
          'enum': ['HYBRID', 'SSD']
        },
        'Description': {
          'type': 'string'
        }
      },
      'required': ['ClusterType', 'Description'],
      'additionalProperties': false
    }
  },
  'patternProperties': {
    '^(?!Type|Properties)[a-zA-Z_][a-zA-Z0-9_]{0,127}$': {
      '$ref': '/Resources/TableStore/Table'
    }
  },
  'required': ['Type', 'Properties'],
  'additionalProperties': false
};

module.exports = otsResourceSchema;