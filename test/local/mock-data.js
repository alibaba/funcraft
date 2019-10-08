'use strict';

const path = require('path');

const functionName = 'python3';

const triggerName = 'http-test';
const { DEFAULT_NAS_PATH_SUFFIX } = require('../../lib/tpl');

const triggerRes = {
  'Type': 'HTTP',
  'Properties': {
    'AuthType': 'ANONYMOUS',
    'Methods': ['GET', 'POST', 'PUT']
  }
};


const functionRes = {
  'Type': 'Aliyun::Serverless::Function',
  'Properties': {
    'Handler': 'index.handler',
    'CodeUri': '.',
    'Description': 'Hello world with python3!',
    'Runtime': 'python3'
  }
};

const httpTriggerFunctionRes = {
  'Type': 'Aliyun::Serverless::Function',
  'Properties': {
    'Handler': 'index.handler',
    'CodeUri': '.',
    'Description': 'Hello world with python3!',
    'Runtime': 'python3'
  },
  'Events': {
    [triggerName]: triggerRes
  }
};

const functionProps = functionRes.Properties;

const serviceName = 'localdemo';

const serviceRes = {
  'Type': 'Aliyun::Serverless::Service',
  'Properties': {
    'Description': 'python local invoke demo'
  },
  [functionName]: functionRes
};

const httpTriggerServiceRes = {
  'Type': 'Aliyun::Serverless::Service',
  'Properties': {
    'Description': 'python local invoke demo'
  },
  [functionName]: httpTriggerFunctionRes
};

const tpl = {
  'ROSTemplateFormatVersion': '2015-09-01',
  'Transform': 'Aliyun::Serverless-2018-04-03',
  'Resources': {
    [serviceName]: serviceRes
  }
};

const serviceResWithNasConfig = {
  'Type': 'Aliyun::Serverless::Service',
  'Properties': {
    'Description': 'php local invoke demo',
    'NasConfig': {
      'UserId': 10003,
      'GroupId': 10003,
      'MountPoints': [
        {
          'ServerAddr': '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/',
          'MountDir': '/mnt/nas'
        }
      ]
    }
  },
  [functionName]: functionRes
};

const debugPort = 8080;
const debugIde = 'vscode';
const tplPath = '.';

const codeMount = {
  Type: 'bind',
  Source: '.',
  Target: '/',
  ReadOnly: false
};

const nasMounts = [{
  Type: 'bind',
  Source: path.join(DEFAULT_NAS_PATH_SUFFIX, '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com', '/'),
  Target: '/mnt/nas',
  ReadOnly: false
}];

module.exports = {
  functionName, functionRes,
  functionProps, serviceName,
  serviceRes, serviceResWithNasConfig,
  debugPort, debugIde, tplPath, codeMount,
  nasMounts, tpl, httpTriggerServiceRes, httpTriggerFunctionRes,
  triggerName, triggerRes
};