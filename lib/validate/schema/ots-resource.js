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
  },
  'patternProperties': {
    '^(?!Type|Properties)[a-zA-Z][a-zA-Z0-9-]{0,127}$': {
      '$ref': '/Resources/TableStore/Table'
    }
  },
  'required': ['Type']
};

module.exports = otsResourceSchema;