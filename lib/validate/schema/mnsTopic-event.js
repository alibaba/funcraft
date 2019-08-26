'use strict';

const MNSTopicEventSchema = {
  '$id': '/Resources/Service/Function/Events/MNSTopic',
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'MNSTopic'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'InvocationRole': {
          'type': 'string'
        },
        'TopicName': {
          'type': 'string'
        },
        'Region': {
          'type': 'string'
        },
        'NotifyContentFormat': {
          'type': 'string',
          'enum': ['STREAM', 'JSON']
        },
        'NotifyStrategy': {
          'type': 'string',
          'enum': ['BACKOFF_RETRY', 'EXPONENTIAL_DECAY_RETRY']
        },
        'FilterTag': {
          'type': 'string'
        },
        'Qualifier': {
          'type': 'string'
        }
      },
      'required': ['TopicName'],
      'additionalProperties': false
    }
  },
  'required': ['Properties'],
  'additionalProperties': false
};

module.exports = MNSTopicEventSchema;