'use strict';

const remoteNasDir = '/mnt/nas';
const mountSource = 'demo';
const serverPath = '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com';
const mountPoint = {
  ServerAddr: `${serverPath}:/${mountSource}`,
  MountDir: remoteNasDir
}; 
const nasConfig = {
  UserId: 1000,
  GroupId: 1000,
  MountPoints: [mountPoint]
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
const tplWithoutNasConfig = {
  ROSTemplateFormatVersion: '2015-09-01',
  Transform: 'Aliyun::Serverless-2018-04-03',
  Resources: {
    [serviceName]: {
      Type: 'Aliyun::Serverless::Service',
      Properties: {
        Policies: policies, 
        VpcConfig: vpcConfig
      }
    }
  }
};
const nasId = 
{
  UserId: 1000,
  GroupId: 1000
};

module.exports = {
  nasConfig, 
  tpl, 
  vpcConfig, 
  serviceName, 
  nasId, 
  tplWithoutNasConfig, 
  remoteNasDir, 
  mountSource, 
  serverPath
};