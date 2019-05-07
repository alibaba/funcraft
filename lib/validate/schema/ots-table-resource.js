'use strict';

const otsTableResourceSchema = {
  '$id': '/Resources/TableStore/Table',
  'type': 'object',
  'description': 'TableStore table',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::TableStore::Table',
      'errorMessage' : {'type':'','const':''}
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'PrimaryKeyList': {
          'errorMessage' : {'type':''},
          'type': 'array',
          'items': {
            'type': 'object',
            'properties': {
              'Name': { 'type': 'string', 'errorMessage' : {'type':''} },
              'Type': {
                'type': 'string',
                'enum': ['STRING', 'INTEGER', 'BINARY'],
                'errorMessage' : { 'type':'', 'enum' : '' }
              }
            },
            'additionalProperties': false,
            'errorMessage' : {
              'type' : '',
              'additionalProperties' : ''
            }
          }
        },
        'ProvisionedThroughput': {
          'type': 'object',
          'properties': {
            'ReadCapacityUnits': {
              'type': 'integer',
              'minimum': -1,
              'errorMessage' : { 'type':'', 'minimum':'' }
            },
            'WriteCapacityUnits': {
              'type': 'integer',
              'minimum': -1,
              'errorMessage' : { 'type':'', 'minimum':'' }
            }
          },
          'additionalProperties': false,
          'errorMessage' : {
            'type' : '',
            'additionalProperties' : ''
          }
        }
      },
      'required': ['PrimaryKeyList'],
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'required' : '',
        'additionalProperties' : ''
      }
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

module.exports = otsTableResourceSchema;