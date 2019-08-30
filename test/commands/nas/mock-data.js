'use strict';

const nasConfig = {
  UserId: 10003,
  GroupId: 10003,
  MountPoints: [{
    ServerAddr: '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com:/',
    MountDir: '/mnt/nas'
  }]
};

const vpcConfig = {
  VpcId: 'vpc-uf6p2abfodpmpmzu6onhy',
  VSwitchIds: [
    'vsw-uf6074gzypzsc95idtxk8'
  ],
  SecurityGroupId: 'sg-uf6h3g45f2fo5lr04akb'
};
const policies = ['AliyunECSNetworkInterfaceManagementAccess', 'AliyunOSSFullAccess'];
const serviceName = 'fun-nas-test';
const tpl = {
  ROSTemplateFormatVersion: '2015-09-01',
  Transform: 'Aliyun::Serverless-2018-04-03',
  Resources: {
    [serviceName]: {
      Type: 'Aliyun::Serverless::Service',
      Properties: {
        Policies: policies, 
        VpcConfig: vpcConfig, 
        NasConfig: nasConfig
      }
    }
  }
};

module.exports = {
  nasConfig, 
  tpl, 
  vpcConfig, 
  serviceName
};