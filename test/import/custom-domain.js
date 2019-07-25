'use strict';

const customDomain1 = {
  customDomain: 'foo.com',
  protocol: 'http',
  routeConfig: {
    routes: [
      { path: '/path1', serviceName: 'service1', functionName: 'function1' },
      { path: '/path2', serviceName: 'service2', functionName: 'function2' },
      { path: '/path3', serviceName: 'service3', functionName: 'function3' }
    ]
  },
  certConfig: {
    certName: 'certName',
    privateKey: 'privateKey',
    certificate: 'certificate'
  }
};

const customDomain2 = {
  customDomain: 'bar.com',
  protocol: 'http',
  routeConfig: {
    routes: [
      { path: '/path1', serviceName: 'service1', functionName: 'function1' },
      { path: '/path2', serviceName: 'service2', functionName: 'function2' },
      { path: '/path3', serviceName: 'service3', functionName: 'function3' }
    ]
  }
};

const customDomainResource1 = {
  'Type': 'Aliyun::Serverless::CustomDomain',
  'Properties': {
    'Protocol': 'http',
    'RouteConfig': {
      'Routes': {
        '/path1': {
          'ServiceName': 'service1',
          'FunctionName': 'function1'
        },
        '/path2': {
          'ServiceName': 'service2',
          'FunctionName': 'function2'
        },
        '/path3': {
          'ServiceName': 'service3',
          'FunctionName': 'function3'
        }
      }
    },
    'CertConfig': {
      'CertName': 'certName',
      'PrivateKey': 'privateKey',
      'Certificate': 'certificate'
    }
  }
};

const customDomainResource2 = {
  'Type': 'Aliyun::Serverless::CustomDomain',
  'Properties': {
    'Protocol': 'http',
    'RouteConfig': {
      'Routes': {
        '/path1': {
          'ServiceName': 'service1',
          'FunctionName': 'function1'
        },
        '/path2': {
          'ServiceName': 'service2',
          'FunctionName': 'function2'
        },
        '/path3': {
          'ServiceName': 'service3',
          'FunctionName': 'function3'
        }
      }
    }
  }
};

module.exports = { customDomain1, customDomain2, customDomainResource1, customDomainResource2 };
