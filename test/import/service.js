'use strict';

const service = () => ({
  serviceName: 'service',
  description: 'description',
  role: 'role',
  logConfig: {
    project: 'project',
    logstore: 'logstore'
  },
  vpcConfig: {
    vpcId: 'vpcId',
    vSwitchIds: ['vSwitchIds'],
    securityGroupId: 'securityGroupId'
  },
  nasConfig: {
    userId: -1,
    groupId: -1,
    mountPoints: [{ serverAddr: 'serverAddr', mountDir: 'mountDir' }]
  },
  internetAccess: true
});

const serviceResouce = () => ({
  'Type': 'Aliyun::Serverless::Service',
  'Properties': {
    'Description': 'description',
    'Role': 'role',
    'LogConfig': {
      'Project': 'project',
      'Logstore': 'logstore'
    },
    'VpcConfig': {
      'VpcId': 'vpcId',
      'VSwitchIds': [
        'vSwitchIds'
      ],
      'SecurityGroupId': 'securityGroupId'
    },
    'NasConfig': {
      'UserId': -1,
      'GroupId': -1,
      'MountPoints': [
        {
          'ServerAddr': 'serverAddr',
          'MountDir': 'mountDir'
        }
      ]
    },
    'InternetAccess': true
  }
});

module.exports = { service, serviceResouce };
