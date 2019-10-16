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


const tplWithDuplicatedFunctionsInService = {
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
      },
      'nodejs6': {
        'Type': 'Aliyun::Serverless::Function',
        'Properties': {
          'Handler': 'index.handler',
          'CodeUri': 'nodejs6',
          'Description': 'Hello world with python3!',
          'Runtime': 'nodejs6'
        }
      },
      'nodejs8': {
        'Type': 'Aliyun::Serverless::Function',
        'Properties': {
          'Handler': 'index.handler',
          'CodeUri': 'nodejs8',
          'Description': 'Hello world with python3!',
          'Runtime': 'nodejs8'
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

const rosTemplate = {
  'ROSTemplateFormatVersion': '2015-09-01',
  'Resources': {
    'localdemo': {
      'Type': 'ALIYUN::FC::Service',
      'Properties': {
        'InternetAccess': true,
        'ServiceName': 'ros-ellison-localdemo-6E86262F4770',
        'Description': 'cstsadasdasdas',
        'LogConfig': {
          'Project': '',
          'Logstore': ''
        }
      }
    },
    'localdemopython3': {
      'Type': 'ALIYUN::FC::Function',
      'Properties': {
        'Code': {
          'OssBucketName': 'ros-ellison',
          'OssObjectName': '6a9fc7e4fbf33530b676fa85c2834d8c'
        },
        'FunctionName': 'ros-ellison-python3-BD6A72101919',
        'ServiceName': 'ros-ellison-localdemo-6E86262F4770',
        'EnvironmentVariables': {
          'PATH': '/code/.fun/root/usr/local/bin:/code/.fun/root/usr/local/sbin:/code/.fun/root/usr/bin:/code/.fun/root/usr/sbin:/code/.fun/root/sbin:/code/.fun/root/bin:/code/.fun/python/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/sbin:/bin',
          'LD_LIBRARY_PATH': '/code/.fun/root/usr/lib:/code/.fun/root/usr/lib/x86_64-linux-gnu:/code:/code/lib:/usr/local/lib',
          'PYTHONUSERBASE': '/code/.fun/python'
        },
        'Handler': 'index.handler',
        'Runtime': 'nodejs10'
      },
      'DependsOn': 'localdemo'
    }
  }
};

module.exports = { tpl, tplWithDuplicatedFunction, tplWithDuplicatedFunctionsInService, rosTemplate };