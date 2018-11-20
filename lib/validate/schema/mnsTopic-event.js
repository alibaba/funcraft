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
          'type': 'string',
        },
      },
      'required': ['TopicName'],
    },
  },
  'required': ['Properties'],
};

module.exports = MNSTopicEventSchema;