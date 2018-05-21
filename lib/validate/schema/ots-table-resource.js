'use strict';

const otsTableResourceSchema = {
  '$id': '/Resources/TableStore/Table',
  'type': 'object',
  'description': 'TableStore table',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::TableStore::Table'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'PrimaryKeyList': {
          'type': 'array',
          'items': {
            'type': 'object',
            'properties': {
              'Name': { 'type': 'string'},
              'Type': {
                'type': 'string',
                'enum': ['STRING', 'INTEGER', 'BINARY']
              }
            }
          }
        },
        'ProvisionedThroughput': {
          'type': 'object',
          'properties': {
            'ReadCapacityUnits': {
              'type': 'integer',
              'minimum': -1
            },
            'WriteCapacityUnits': {
              'type': 'integer',
              'minimum': -1
            }
          }
        }
      }
    }
  },
  'required': ['Type']
};

module.exports = otsTableResourceSchema;