'use strict';

const mnsTopicResourceSchema = {
  '$id': '/Resources/MNSTopic',
  'type': 'object',
  'description': 'MNS Topic resource',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::MNSTopic',
      'errorMessage' : { 'type':'','const' : '' }
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Region': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        },
        'MaximumMessageSize': {
          'type': 'integer',
          'errorMessage' : { 'type':'' }
        },
        'LoggingEnabled': {
          'type': 'boolean',
          'errorMessage' : { 'type':'' }
        },
      },
      'required': ['Region'],
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'required' : '',
        'additionalProperties' : ''
      }
    },
  },
  'required': ['Type', 'Properties'],
  'additionalProperties': false,
  'errorMessage' : {
    'type' : '',
    'required' : '',
    'additionalProperties' : ''
  }
};


module.exports = mnsTopicResourceSchema;