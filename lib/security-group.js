'use strict';
const { throwProcessedException } = require('./error-message');

var requestOption = {
  method: 'POST'
};

async function describeSecurityGroups(client, region, vpcId, securityGroupName) {
  var params = {
    'RegionId': region,
    'VpcId': vpcId,
    'SecurityGroupName': securityGroupName
  };

  const describeRs = await client.request('DescribeSecurityGroups', params, requestOption);

  const securityGroup = describeRs.SecurityGroups.SecurityGroup;

  return securityGroup;
}

async function authSecurityGroupRule(ecsClient, region, securityGroupId, protocol, port) {
  var params = {
    'RegionId': region,
    'SecurityGroupId': securityGroupId,
    'IpProtocol': protocol,
    'PortRange': port,
    'Policy': 'Accept',
    'SourceCidrIp': '0.0.0.0/0',
    'NicType': 'intranet'
  };

  const rs = await ecsClient.request('AuthorizeSecurityGroup', params, requestOption);
  return rs;
}

async function authDefaultSecurityGroupRules(ecsClient, region, securityGroupId) {

  const sgRules = [
    { protocol: 'TCP', port: '80/80' },
    { protocol: 'TCP', port: '443/443' },
    { protocol: 'ICMP', port: '-1/-1' },
    { protocol: 'TCP', port: '22/22' }
  ];

  for (const rule of sgRules) {
    await authSecurityGroupRule(ecsClient, region, securityGroupId, rule.protocol, rule.port);
  }
}

async function createSecurityGroup(ecsClient, region, vpcId, securityGroupName) {
  var params = {
    'RegionId': region,
    'SecurityGroupName': securityGroupName,
    'Description': 'default security group created by fc fun',
    'VpcId': vpcId,
    'SecurityGroupType': 'normal'
  };

  var createRs;

  try {
    
    createRs = await ecsClient.request('CreateSecurityGroup', params, requestOption);

  } catch (ex) {
    
    throwProcessedException(ex, 'AliyunECSFullAccess');
  }

  return createRs.SecurityGroupId;
}

module.exports = {
  describeSecurityGroups,
  createSecurityGroup,
  authDefaultSecurityGroupRules
};