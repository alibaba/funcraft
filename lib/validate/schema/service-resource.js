'use strict';

const serviceResourceSchema = {
  '$id': '/Resources/Service',
  'type': 'object',
  'description': 'Service',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::Service'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Description': {
          'type': 'string'
        },
        'Role': {
          'type': 'string'
        },
        'Policies': {
          oneOf: [
            { 'type': 'string' },
            { '$ref': '/Resources/Service/Role' },
            {
              'type': 'array',
              'items': {
                oneOf: [
                  { 'type': 'string' },
                  { '$ref': '/Resources/Service/Role' }
                ]
              }
            }
          ]
        },
        'InternetAccess': {
          'type': 'boolean'
        },
        'VpcConfig': {
          oneOf: [
            { 'type': 'string' },
            {
              'type': 'object',
              'properties': {
                'VpcId': { 'type': 'string' },
                'VSwitchIds': {
                  'type': 'array',
                  'items': { 'type': 'string' }
                },
                'SecurityGroupId': { 'type': 'string' }
              },
              'required': ['VpcId', 'VSwitchIds', 'SecurityGroupId'],
              'additionalProperties': false
            }
          ]
        },
        'LogConfig': {
          'type': 'object',
          'properties': {
            'Project': { 'type': 'string' },
            'Logstore': { 'type': 'string' }
          },
          'required': ['Project', 'Logstore'],
          'additionalProperties': false
        },
        'NasConfig': {
          oneOf: [
            { 'type': 'string' },
            {
              'type': 'object',
              'properties': {
                'UserId': { 'type': 'integer' },
                'GroupId': { 'type': 'integer' },
                'MountPoints': {
                  'type': 'array',
                  'items': {
                    'type': 'object',
                    'properties': {
                      'ServerAddr': { 'type': 'string' },
                      'MountDir': { 'type': 'string' }
                    },
                    'required': ['ServerAddr', 'MountDir'],
                    'additionalProperties': false
                  }
                }
              },
              'required': ['UserId', 'GroupId', 'MountPoints'],
              'additionalProperties': false
            }
          ]

        }
      },
      'additionalProperties': false
    }
  },
  'patternProperties': {
    '^(?!Type|Properties)[a-zA-Z_][a-zA-Z0-9_-]{0,127}$': {
      '$ref': '/Resources/Service/Function'
    }
  },
  'required': ['Type'],
  'additionalProperties': false
};

module.exports = serviceResourceSchema;