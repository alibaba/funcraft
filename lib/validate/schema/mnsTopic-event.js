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
      },
      'required': ['TopicName'],
    },
  },
  'required': ['Properties'],
};

module.exports = MNSTopicEventSchema;