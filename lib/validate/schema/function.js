'use strict';

const functionSchema = {
  '$id': '/Resources/Service/Function',
  'type': 'object',
  'description': 'Function',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::Function'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Handler': {
          'type': 'string'
        },
        'Initializer': {
          'type': 'string'
        },
        'Runtime': {
          'type': 'string',
          'enum': ['nodejs6', 'nodejs8', 'nodejs10', 'python2.7', 'python3', 'java8', 'php7.2', 'dotnetcore2.1', 'custom']
        },
        'CodeUri': {
          'type': 'string'
        },
        'Description': {
          'type': 'string'
        },
        'Timeout': {
          'type': 'integer'
        },
        'InitializationTimeout': {
          'type': 'integer'
        },
        'EnvironmentVariables': {
          'type': 'object'
        },
        'MemorySize': {
          'type': 'integer'
        }
      },
      'required': ['Handler', 'Runtime', 'CodeUri'],
      'additionalProperties': false
    },
    'Events': {
      'type': 'object',
      'patternProperties': {
        '^[a-zA-Z_][a-zA-Z0-9_-]{0,127}$': {
          'properties': {
            'Type': {
              'type': 'string',
              'enum': ['Datahub', 'Api', 'TableStore', 'Timer', 'HTTP', 'Log', 'RDS', 'MNSTopic', 'OSS', 'CDN']
            }
          },
          'if': {
            'properties': {
              'Type': {
                'type': 'string',
                'const': 'CDN'
              }
            }
          },
          'then': { '$ref': '/Resources/Service/Function/Events/CDN' },
          'else': {

            'if': {
              'properties': {
                'Type': {
                  'type': 'string',
                  'const': 'OSS'
                }
              }
            },
            'then': { '$ref': '/Resources/Service/Function/Events/OSS' },
            'else': {

              'if': {
                'properties': {
                  'Type': {'type': 'string', 'const': 'MNSTopic'}
                }
              },
              'then': { '$ref': '/Resources/Service/Function/Events/MNSTopic' },
              'else': {

                'if': {
                  'properties': {
                    'Type': {'type': 'string', 'const': 'RDS'}
                  }
                },
                'then': { '$ref': '/Resources/Service/Function/Events/RDS' },
                'else': {

                  'if': {
                    'properties': {
                      'Type': {'type': 'string', 'const': 'Log'}
                    }
                  },
                  'then': { '$ref': '/Resources/Service/Function/Events/Log' },
                  'else': {

                    'if': {
                      'properties': {
                        'Type': {'type': 'string', 'const': 'HTTP'}
                      }
                    },
                    'then': { '$ref': '/Resources/Service/Function/Events/Http' },
                    'else': {

                      'if': {
                        'properties': {
                          'Type': {'type': 'string', 'const': 'Timer'}
                        }
                      },
                      'then': { '$ref': '/Resources/Service/Function/Events/Timer' },
                      'else': {

                        'if': {
                          'properties': {
                            'Type': {'type': 'string', 'const': 'TableStore'}
                          }
                        },
                        'then': { '$ref': '/Resources/Service/Function/Events/TableStore' },
                        'else': {

                          'if': {
                            'properties': {
                              'Type': {'type': 'string', 'const': 'API'}
                            }
                          },
                          'then': { '$ref': '/Resources/Service/Function/Events/API' },
                          'else': {

                            'if': {
                              'properties': {
                                'Type': {'type': 'string', 'const': 'Datahub'}
                              }
                            },
                            'then': { '$ref': '/Resources/Service/Function/Events/Datahub' },
                            'else': false
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  'required': ['Type'],
  'additionalProperties': false
};
module.exports = functionSchema;
