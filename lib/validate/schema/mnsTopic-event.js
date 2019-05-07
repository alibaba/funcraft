'use strict';

const MNSTopicEventSchema = {
  '$id': '/Resources/Service/Function/Events/MNSTopic',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'MNSTopic',
      'errorMessage' : { 'type':'','const' : '' }
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'TopicName': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        },
        'Region': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        },
        'NotifyContentFormat': {
          'type': 'string',
          'enum': ['STREAM', 'JSON'],
          'errorMessage' : { 'type':'','enum' : '' }
        },
        'NotifyStrategy': {
          'type': 'string',
          'enum': ['BACKOFF_RETRY', 'EXPONENTIAL_DECAY_RETRY'],
          'errorMessage' : { 'type':'','enum' : '' }
        },
        'FilterTag': {
          'type': 'string',
          'errorMessage' : { 'type':'' }
        },
      },
      'required': ['TopicName'],
      'additionalProperties': false,
      'errorMessage' : {
        'type' : '',
        'required' : '',
        'additionalProperties' : ''
      }
    },
  },
  'required': ['Properties'],
  'additionalProperties': false,
  'errorMessage' : {
    'type' : '',
    'required' : '',
    'additionalProperties' : ''
  }
};

module.exports = MNSTopicEventSchema;