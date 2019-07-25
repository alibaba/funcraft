'use strict';

const tpl = {
  'ROSTemplateFormatVersion': '2015-09-01',
  'Transform': 'Aliyun::Serverless-2018-04-03',
  'Resources': {
    'localdemo': {
      'Type': 'Aliyun::Serverless::Service',
      'Properties': {
        'Description': 'php local invoke demo'
      },
      'python3': {
        'Type': 'Aliyun::Serverless::Function',
        'Properties': {
          'Handler': 'index.handler',
          'CodeUri': 'python3',
          'Description': 'Hello world with python3!',
          'Runtime': 'python3'
        }
      }
    }
  }
};

const tplWithDuplicatedFunction = {
  'ROSTemplateFormatVersion': '2015-09-01',
  'Transform': 'Aliyun::Serverless-2018-04-03',
  'Resources': {
    'localdemo': {
      'Type': 'Aliyun::Serverless::Service',
      'Properties': {
        'Description': 'php local invoke demo'
      },
      'python3': {
        'Type': 'Aliyun::Serverless::Function',
        'Properties': {
          'Handler': 'index.handler',
          'CodeUri': 'python3',
          'Description': 'Hello world with python3!',
          'Runtime': 'python3'
        }
      }
    },
    'localdemo2': {
      'Type': 'Aliyun::Serverless::Service',
      'Properties': {
        'Description': 'php local invoke demo'
      },
      'python3': {
        'Type': 'Aliyun::Serverless::Function',
        'Properties': {
          'Handler': 'index.handler2',
          'CodeUri': 'python3',
          'Description': 'Hello world with python3 2!',
          'Runtime': 'python3'
        }
      }
    }
  }
};

module.exports = { tpl, tplWithDuplicatedFunction };