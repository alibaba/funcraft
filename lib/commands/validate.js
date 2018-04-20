'use strict';

const fs = require('fs');
const util = require('util');

const yaml = require('js-yaml');
const Ajv = require('ajv');

const exists = util.promisify(fs.exists);
const readFile = util.promisify(fs.readFile);

/**
 * JSON Schema for template.yml
 * http://json-schema.org/
 */
const rosSchema = {
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
        '^[a-zA-Z_][a-zA-Z0-9_-]{0,127}$': {
          anyOf: [
            {'$ref': '/Resources/Service'},
            {'$ref': '/Resources/Api'}
          ]         
        }
      }
    }
  },
  'required': ['ROSTemplateFormatVersion', 'Resources']
};
const serviceResourceSchema = {
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
        }
      }
    }
  },
  'patternProperties': {
    '^(?!Type|Properties)[a-zA-Z_][a-zA-Z0-9_-]{0,127}$': {
      '$ref': '/Resources/Service/Function'
    }
  },
  'required': ['Type']
};

const functionSchema = {
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
        'Runtime': {
          'type': 'string',
          'enum': ['nodejs6', 'nodejs8', 'python2.7', 'python3', 'java8'],
        },
        'CodeUri': {
          'type': 'string'
        },
        'Description': {
          'type': 'string'
        }
      }
    },
    'Events': {
      'type': 'object',
      'patternProperties': {
        '^[a-zA-Z_][a-zA-Z0-9_-]{0,127}$': {
          'anyOf': [
            { '$ref': '/Resources/Service/Function/Events/Datahub' },
            { '$ref': '/Resources/Service/Function/Events/API' },
            { '$ref': '/Resources/Service/Function/Events/OTS' },
            { '$ref': '/Resources/Service/Function/Events/Timer' },
          ]

        }
      }
    },
  },
  'required': ['Type']
};

const datahubEventSchema = {
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Datahub'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Topic': {
          'type': 'string'
        },
        'StartingPosition': {
          'type': 'string',
          'enum': ['LATEST', 'OLDEST', 'SYSTEM_TIME']
        },
        'BatchSize': {
          'type': 'integer',
          'minimum': 1
        }
      },
      'required': ['Topic', 'StartingPosition']
    }
  }
};

const apiEventSchema = {
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'API'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Path': {
          'type': 'string'
        },
        'Method': {
          'type': 'string',
          'enum': ['get', 'head', 'post', 'put', 'delete', 'connect', 'options', 'trace', 'patch',
            'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH',
            'Get', 'Head', 'Post', 'Put', 'Delete', 'Connect', 'Options', 'Trace', 'Patch'
          ]
        },
        'RestApiId': {
          'oneOf': [
            { 'type': 'string' },
            {
              'type': 'object',
              'properties': {
                'Ref': { 'type': 'string' }
              }
            }
          ]

        }
      },
      'required': ['Path', 'Method']
    }
  }
};

const apiRescoureSchema = {
  'type': 'object',
  'description': 'API',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Aliyun::Serverless::Api'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Name': {
          'type': 'string'
        },
        'DefinitionBody': {
          'type': 'object'
        },
        'DefinitionUri': {
          'type': 'string'
        },
        'Cors': {
          oneOf: [
            {'type': 'string'},
            {'$ref': '/CORS'}
          ]
          
        }
      }
    }
  },
  'required': ['Type']
};

const corsSchema = {
  'type': 'object',
  'properties': {
    'AllowMethods':{
      'type': 'string'
    },
    'AllowHeaders':{
      'type': 'string'
    },
    'AllowOrigin':{
      'type': 'string'
    },
    'MaxAge':{
      'type': 'string'
    }
  },
  'required': ['AllowOrigin']
};

const otsEventSchema = {
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'OTS'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Stream': {
          'type': 'string'
        }
      },
      'required': ['Stream']
    }
  }
};

const timerEventSchema = {
  'type': 'object',
  'properties': {
    'Type': {
      'type': 'string',
      'const': 'Timer'
    },
    'Properties': {
      'type': 'object',
      'properties': {
        'Payload': {
          'type': 'string'
        },
        'CronExpression': {
          'type': 'string'
        },
        'Enable': {
          'type': 'boolean'
        },
      },
      'required': ['CronExpression']
    }
  }
};


async function validate() {
  if (!(await exists('template.yml'))) {
    console.error('Can\'t found template.yml in current dir.');
    return;
  }

  const tplContent = await readFile('template.yml', 'utf8');
  const tpl = yaml.safeLoad(tplContent);
  const ajv = new Ajv();
  const valid = ajv.addSchema(datahubEventSchema, '/Resources/Service/Function/Events/Datahub')
    .addSchema(apiEventSchema, '/Resources/Service/Function/Events/API')
    .addSchema(otsEventSchema, '/Resources/Service/Function/Events/OTS')
    .addSchema(timerEventSchema, '/Resources/Service/Function/Events/Timer')
    .addSchema(functionSchema, '/Resources/Service/Function')
    .addSchema(serviceResourceSchema, '/Resources/Service')
    .addSchema(apiRescoureSchema, '/Resources/Api')
    .addSchema(corsSchema, '/CORS')
    .validate(rosSchema, tpl);


  if (valid) {
    console.log(JSON.stringify(tpl, null, 2));
  } else {
    console.error(JSON.stringify(ajv.errorsText(), null, 2));
  }
  return valid;
}

module.exports = validate;