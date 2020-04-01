'use strict';

const expect = require('expect.js');
const { processResources } = require('../../lib/deploy/deploy-diffs');
const jsonDiff = require('json-diff');

describe('test services role diff', () => {
  it('test default service role', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          'Role': 'acs:ram::1911504709953557:role/aliyunfcgeneratedrole-cn-beijing-nasdemo',
          'Description': 'demo'
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          'Description': 'demo'
        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([]);
  });

  it('test delete custom service role', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          'Role': 'acs:ram::1911504709953557:role/customRole',
          'Description': 'demo'
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          'Description': 'demo'
        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([
      {
        'action': 'Delete',
        'id': 'localdemo',
        'propsName': 'Role',
        'resourceType': 'Aliyun::Serverless::Service'
      }
    ]);
  });

  it('test modify custom service role', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          'Role': 'acs:ram::1911504709953557:role/customRole',
          'Description': 'demo'
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          'Role': 'acs:ram::1911504709953557:role/modifyRole',
          'Description': 'demo'
        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([
      {
        'action': 'Modify',
        'id': 'localdemo',
        'propsName': 'Role',
        'resourceType': 'Aliyun::Serverless::Service'
      }
    ]);
  });
});

describe('test services vpcConfig diff', () => {
  it('test delete vpc config', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          VpcConfig: {
            VpcId: 'vpc-bp12hm92gdpcjtai7ua82',
            VSwitchIds: ['vsw-bp1gitru7oicyyb4uiylj'],
            SecurityGroupId: 'sg-bp1243pi65bw4cjj4bks'
          }
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {

        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([
      {
        'action': 'Delete',
        'id': 'localdemo',
        'propsName': 'VpcConfig',
        'resourceType': 'Aliyun::Serverless::Service'
      }
    ]);
  });

  it('test modify vpc config', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          VpcConfig: {
            VpcId: 'vpc-bp12hm92gdpcjtai7ua82',
            VSwitchIds: ['vsw-bp1gitru7oicyyb4uiylj'],
            SecurityGroupId: 'sg-bp1243pi65bw4cjj4bks'
          }
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          VpcConfig: {
            VpcId: 'vpc-aaaaaa',
            VSwitchIds: ['vsw-bp1gitru7oicyyb4uiylj'],
            SecurityGroupId: 'sg-bp1243pi65bw4cjj4bks'
          }
        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([
      {
        'action': 'Modify',
        'id': 'localdemo',
        'propsName': 'VpcConfig',
        'resourceType': 'Aliyun::Serverless::Service'
      }
    ]);
  });

  it('test add vpc config', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          VpcConfig: {
            VpcId: 'vpc-aaaaaa',
            VSwitchIds: ['vsw-bp1gitru7oicyyb4uiylj'],
            SecurityGroupId: 'sg-bp1243pi65bw4cjj4bks'
          }
        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([
      {
        'action': 'Add',
        'id': 'localdemo',
        'propsName': 'VpcConfig',
        'resourceType': 'Aliyun::Serverless::Service'
      }
    ]);
  });

  it('test nas auto created vpc config', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          VpcConfig: {
            VpcId: 'vpc-aaaaaa',
            VSwitchIds: ['vsw-bp1gitru7oicyyb4uiylj'],
            SecurityGroupId: 'sg-bp1243pi65bw4cjj4bks'
          }
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          NasConfig: 'Auto'
        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([
      {
        'action': 'Add',
        'id': 'localdemo',
        'propsName': 'NasConfig',
        'resourceType': 'Aliyun::Serverless::Service'
      }
    ]);
  });
});

describe('test services NasConfig diff', () => {
  it('test delete NasConfig', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          NasConfig: {
            UserId: -1,
            GroupId: -1,
            MountPoints: [{
              ServerAddr: '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/',
              MountDir: '/mnt/test'
            }]
          }
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {

        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([
      {
        'action': 'Delete',
        'id': 'localdemo',
        'propsName': 'NasConfig',
        'resourceType': 'Aliyun::Serverless::Service'
      }
    ]);
  });

  it('test modify NasConfig', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          NasConfig: {
            UserId: -1,
            GroupId: -1,
            MountPoints: [{
              ServerAddr: '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/',
              MountDir: '/mnt/test'
            }]
          }
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          NasConfig: {
            UserId: 100,
            GroupId: 100,
            MountPoints: [{
              ServerAddr: '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/',
              MountDir: '/mnt/test'
            }]
          }
        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([
      {
        'action': 'Modify',
        'id': 'localdemo',
        'propsName': 'NasConfig',
        'resourceType': 'Aliyun::Serverless::Service'
      }
    ]);
  });

  it('test add NasConfig', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          NasConfig: {
            UserId: -1,
            GroupId: -1,
            MountPoints: [{
              ServerAddr: '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/',
              MountDir: '/mnt/test'
            }]
          }
        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([
      {
        'action': 'Add',
        'id': 'localdemo',
        'propsName': 'NasConfig',
        'resourceType': 'Aliyun::Serverless::Service'
      }
    ]);
  });

  it('test nas auto created nas config', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          NasConfig: {
            UserId: -1,
            GroupId: -1,
            MountPoints: [{
              ServerAddr: '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/',
              MountDir: '/mnt/test'
            }]
          }
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          NasConfig: 'Auto'
        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([]);
  });
});

describe('test services normal props', () => {
  it('test delete props', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          LogConfig: {
            Project: 'log-com-m',
            Logstore: 'log-en-m'
          },
          Description: 'description',
          InternetAccess: false
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {

        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([
      {
        'action': 'Delete',
        'id': 'localdemo',
        'propsName': 'LogConfig',
        'resourceType': 'Aliyun::Serverless::Service'
      },
      {
        'action': 'Delete',
        'id': 'localdemo',
        'propsName': 'Description',
        'resourceType': 'Aliyun::Serverless::Service'
      },
      {
        'action': 'Delete',
        'id': 'localdemo',
        'propsName': 'InternetAccess',
        'resourceType': 'Aliyun::Serverless::Service'
      }
    ]);
  });

  it('test modify props', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          LogConfig: {
            Project: 'log-com-m',
            Logstore: 'log-en-m'
          },
          Description: 'description',
          InternetAccess: false
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          LogConfig: {
            Project: 'modified',
            Logstore: 'modified'
          },
          Description: 'descrimodifiedtion',
          InternetAccess: true
        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([
      {
        'action': 'Modify',
        'id': 'localdemo',
        'propsName': 'LogConfig',
        'resourceType': 'Aliyun::Serverless::Service'
      },
      {
        'action': 'Modify',
        'id': 'localdemo',
        'propsName': 'Description',
        'resourceType': 'Aliyun::Serverless::Service'
      },
      {
        'action': 'Modify',
        'id': 'localdemo',
        'propsName': 'InternetAccess',
        'resourceType': 'Aliyun::Serverless::Service'
      }
    ]);
  });

  it('test add props', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {

        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        'Properties': {
          LogConfig: {
            Project: 'log-com-m',
            Logstore: 'log-en-m'
          },
          Description: 'description',
          InternetAccess: false
        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([
      {
        'action': 'Add',
        'id': 'localdemo',
        'propsName': 'LogConfig',
        'resourceType': 'Aliyun::Serverless::Service'
      },
      {
        'action': 'Add',
        'id': 'localdemo',
        'propsName': 'Description',
        'resourceType': 'Aliyun::Serverless::Service'
      },
      {
        'action': 'Add',
        'id': 'localdemo',
        'propsName': 'InternetAccess',
        'resourceType': 'Aliyun::Serverless::Service'
      }
    ]);
  });
});

describe('test function props', () => {
  it('test delete props', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        php72: {
          Type: 'Aliyun::Serverless::Function',
          Properties: {
            Handler: 'index.handler',
            CodeUri: 'php7.2/index.php',
            Description: 'Hello world with php7.2!',
            Runtime: 'php7.2',
            Initializer: 'initializer.handler',
            MemorySize: '256',
            Timeout: 3,
            InitializationTimeout: 3,
            EnvironmentVariables: {
              TestKey: 'TestValue'
            },
            InstanceConcurrency: 1
          }
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        php72: {
          Type: 'Aliyun::Serverless::Function',
          Properties: {

          }
        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([
      {
        'action': 'Delete',
        'id': 'php72',
        'propsName': 'Handler',
        'resourceType': 'Aliyun::Serverless::Function'
      },
      {
        'action': 'Modify',
        'id': 'php72',
        'propsName': 'CodeUri',
        'resourceType': 'Aliyun::Serverless::Function'
      },
      {
        'action': 'Delete',
        'id': 'php72',
        'propsName': 'Description',
        'resourceType': 'Aliyun::Serverless::Function'
      },
      {
        'action': 'Delete',
        'id': 'php72',
        'propsName': 'Runtime',
        'resourceType': 'Aliyun::Serverless::Function'
      },
      {
        'action': 'Delete',
        'id': 'php72',
        'propsName': 'Initializer',
        'resourceType': 'Aliyun::Serverless::Function'
      },
      {
        'action': 'Delete',
        'id': 'php72',
        'propsName': 'MemorySize',
        'resourceType': 'Aliyun::Serverless::Function'
      }
    ]);
  });
});

describe('test function trigger props', () => {
  it('test modify trigger props', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        php72: {
          Type: 'Aliyun::Serverless::Function',
          Events: {
            'http-test': {
              'Type': 'HTTP',
              'Properties': {
                'AuthType': 'ANONYMOUS',
                'Methods': ['GET', 'POST', 'PUT']
              }
            }
          }
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        php72: {
          Type: 'Aliyun::Serverless::Function',
          Events: {
            'http-test': {
              'Type': 'HTTP',
              'Properties': {
                'AuthType': 'function',
                'Methods': ['GET']
              }
            }
          }
        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([
      {
        'action': 'Modify',
        'id': 'http-test',
        'propsName': 'AuthType',
        'resourceType': 'HTTP'
      },
      {
        'action': 'Modify',
        'id': 'http-test',
        'propsName': 'Methods',
        'resourceType': 'HTTP'
      }
    ]);

  });

  it('test delete trigger', async () => {
    const remoteYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        php72: {
          Type: 'Aliyun::Serverless::Function',
          Events: {
            'http-test': {
              'Type': 'HTTP',
              'Properties': {
                'AuthType': 'ANONYMOUS',
                'Methods': ['GET', 'POST', 'PUT']
              }
            }
          }
        }
      }
    };

    const localYml = {
      'localdemo': {
        'Type': 'Aliyun::Serverless::Service',
        php72: {
          Type: 'Aliyun::Serverless::Function'
        }
      }
    };

    const diff = jsonDiff.diff(remoteYml, localYml);

    const changes = processResources(diff, localYml, remoteYml);

    expect(changes).to.eql([]);

  });
});