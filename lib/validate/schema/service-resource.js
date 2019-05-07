'use strict';

const serviceResourceSchema = {
  '$id': '/Resources/Service',
  'type': 'object',
  'description': 'Service',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::Service',
      'errorMessage' :{'type':'','const' : ''}
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Description': {
          'type': 'string',
          'errorMessage' :{
            'type' : ''
          }
        },
        'Role': {
          'type': 'string',
          'errorMessage' :{
            'type' : ''
          }
        },
        'Policies': {
          oneOf: [
            { 
              'type': 'string',
              'errorMessage' :{
                'type' : ''
              }
            },
            { '$ref': '/Resources/Service/Role' } ,
            { 
              'type': 'array', 
              'items': { 
                oneOf: [
                  { 'type': 'string' },
                  { '$ref': '/Resources/Service/Role' }
                ]
              },
              'errorMessage' :{
                'type' : ''
              }
            },
          ]
        },
        'InternetAccess': {
          'type': 'boolean',
          'errorMessage' :{
            'type' : ''
          }
        },
        'VpcConfig': {
          'type': 'object',
          'properties': {
            'VpcId': {'type': 'string','errorMessage' : {'type':''}},
            'VSwitchIds': {
              'type': 'array','errorMessage' :{'type':''}, 
              'items': {'type': 'string','errorMessage' : {'type':''}}
            },
            'SecurityGroupId': {'type': 'string','errorMessage' :{'type':''}}
          },
          'required': ['VpcId', 'VSwitchIds', 'SecurityGroupId'],
          'additionalProperties': false,
          'errorMessage' : {
            'type' : '',
            'required' : '',
            'additionalProperties' : ''
          }
        },
        'LogConfig': {
          'type': 'object',
          'properties': {
            'Project': {'type': 'string','errorMessage' : {'type':''}},
            'Logstore': {'type': 'string','errorMessage' : {'type':''}}
          },
          'required': ['Project', 'Logstore'],
          'additionalProperties': false,
          'errorMessage' : {
            'type' : '',
            'required' : '',
            'additionalProperties' : ''
          }
        },
        'NasConfig': {
          'type': 'object',
          'properties': {
            'UserId': {'type': 'integer','errorMessage' : {'type':''}},
            'GroupId': {'type': 'integer','errorMessage' : {'type':''}},
            'MountPoints': {
              'type': 'array',
              'items': {
                'type': 'object',
                'properties': {
                  'ServerAddr': {'type': 'string','errorMessage' : {'type':''}},
                  'MountDir': {'type': 'string','errorMessage' : {'type':''}}
                },
                'required': ['ServerAddr', 'MountDir'],
                'additionalProperties': false,
                'errorMessage' : {
                  'type' : '',
                  'required' : '',
                  'additionalProperties' : ''
                }
              }
            }
          },
          'required': ['UserId', 'GroupId', 'MountPoints'],
          'additionalProperties': false,
          'errorMessage' : {
            'type' : '',
            'required' : '',
            'additionalProperties' : ''
          }
        }
      },
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'additionalProperties' : ''
      }
    }
  },
  'patternProperties': {
    '^(?!Type|Properties)[a-zA-Z_][a-zA-Z0-9_-]{0,127}$': {
      '$ref': '/Resources/Service/Function'
    }
  },
  'required': ['Type'],
  'additionalProperties': false,
  'errorMessage': {
    'type': 'should be an object',
    'required':'',
    'additionalProperties':''
  }
};

module.exports = serviceResourceSchema;