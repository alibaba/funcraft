'use strict';

const rosSchema = {
  '$id': '/ROS',
  'title': 'fun template',
  'type': 'object',
  'properties': {
    'ROSTemplateFormatVersion': {
      'type': 'string',
      'enum': ['2015-09-01']
    },
    'Transform': {
      'type': 'string',
      'enum': ['Aliyun::Serverless-2018-04-03']
    },
    'Resources': {
      'type': 'object',
      'patternProperties': {
        '^[a-zA-Z_][a-zA-Z.0-9_-]{0,127}$': {
          'properties': {
            'Type': {
              'type': 'string',
              'enum': ['Aliyun::Serverless::Service', 'Aliyun::Serverless::TableStore', 'Aliyun::Serverless::Api', 'Aliyun::Serverless::Log', 'Aliyun::Serverless::CustomDomain', 'Aliyun::Serverless::MNSTopic']
            }
          },
          'if': {
            'properties': {
              'Type': {
                'type': 'string',
                'const': 'Aliyun::Serverless::Service'
              }
            }
          },
          'then': { '$ref': '/Resources/Service' },
          'else': {
            'if': {
              'properties': {
                'Type': {
                  'type': 'string',
                  'const': 'Aliyun::Serverless::TableStore'
                }
              }
            },
            'then': { '$ref': '/Resources/TableStore' },
            'else': {
              'if': {
                'properties': {
                  'Type': {
                    'type': 'string',
                    'const': 'Aliyun::Serverless::Api'
                  }
                }
              },
              'then': { '$ref': '/Resources/Api' },
              'else': {
                'if': {
                  'properties': {
                    'Type': {
                      'type': 'string',
                      'const': 'Aliyun::Serverless::Log'
                    }
                  }
                },
                'then': { '$ref': '/Resources/Log' },
                'else': {

                  'if': {
                    'properties': {
                      'Type': {
                        'type': 'string',
                        'const': 'Aliyun::Serverless::CustomDomain'
                      }
                    }
                  },
                  'then': { '$ref': '/Resources/CustomDomain' },
                  'else': {
                    'if': {
                      'properties': {
                        'Type': {
                          'type': 'string',
                          'const': 'Aliyun::Serverless::MNSTopic'
                        }
                      }
                    },
                    'then': { '$ref': '/Resources/MNSTopic' },
                    'else': false
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  'required': ['ROSTemplateFormatVersion', 'Resources'],
  'additionalProperties': false
};

module.exports = rosSchema;