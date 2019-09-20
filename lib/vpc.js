'use strict';

const getProfile = require('./profile').getProfile;
const _ = require('lodash');
const { getVpcPopClient, getEcsPopClient } = require('./client');

const vswitch = require('./vswitch');
const securityGroup = require('./security-group');
const debug = require('debug')('fun:nas');
const { green } = require('colors');
const { sleep } = require('./time');
const { throwProcessedException } = require('./error-message');

var requestOption = {
  method: 'POST'
};

const defaultVSwitchName = 'fc-fun-vswitch-1';
const defaultSecurityGroupName = 'fc-fun-sg-1';

async function findVpc(vpcClient, region, vpcName) {

  const pageSize = 50; // max value is 50. see https://help.aliyun.com/document_detail/104577.html
  let requestPageNumber = 0;
  let totalCount;
  let pageNumber;

  let vpc;

  do {
    var params = {
      'RegionId': region,
      'PageSize': pageSize,
      'PageNumber': ++requestPageNumber
    };

    const rs = await vpcClient.request('DescribeVpcs', params, requestOption);

    totalCount = rs.TotalCount;
    pageNumber = rs.PageNumber;
    const vpcs = rs.Vpcs.Vpc;
  
    debug('find vpc rs: %s', rs);

    vpc = _.find(vpcs, { VpcName: vpcName });
  
    debug('find default vpc: %s', vpc);

  } while (!vpc && totalCount && pageNumber && pageNumber * pageSize < totalCount);

  return vpc;
}

async function createVpc(vpcClient, region, vpcName) {
  var createParams = {
    'RegionId': region,
    'CidrBlock': '10.0.0.0/8',
    'EnableIpv6': false,
    'VpcName': vpcName,
    'Description': 'default vpc created by fc fun'
  };

  var createRs;

  try {

    createRs = await vpcClient.request('CreateVpc', createParams, requestOption);
    
  } catch (ex) {

    throwProcessedException(ex, 'AliyunVpcFullAccess');
  }

  const vpcId = createRs.VpcId;

  debug('create vpc rs is: %j', createRs);

  await waitVpcUntilAvaliable(vpcClient, region, vpcId);

  return vpcId;
}

async function waitVpcUntilAvaliable(vpcClient, region, vpcId) {

  let count = 0;
  let status;

  do {
    count++;

    var params = {
      'RegionId': region,
      'VpcId': vpcId
    };
    
    await sleep(800);

    const rs = await vpcClient.request('DescribeVpcs', params, requestOption);
    
    status = rs.Vpcs.Vpc[0].Status;
    
    debug('vpc status is: ' + status);

    console.log(`\t\tvpc already created, waiting for status to be 'Available', now is ${status}`);
    
  } while (count < 15 && status !== 'Available');

  if (status !== 'Available') { throw new Error(`Timeout while waiting for vpc ${vpcId} status to be 'Available'`); }

}

async function createDefaultVSwitchIfNotExist(vpcClient, region, vpcId, vswitchIds) {
  let vswitchId = await vswitch.findVswitchExistByName(vpcClient, region, vswitchIds, defaultVSwitchName);

  if (!vswitchId) { // create vswitch
    console.log('\t\tcould not find default vswitch, ready to generate one');
    vswitchId = await vswitch.createDefaultVSwitch(vpcClient, region, vpcId, defaultVSwitchName);
    console.log(green('\t\tdefault vswitch has been generated, vswitchId is: ' + vswitchId));
  } else {
    console.log(green('\t\tvswitch already generated, vswitchId is: ' + vswitchId));
  }

  return vswitchId;
}

async function createDefaultSecurityGroupIfNotExist(ecsClient, region, vpcId) {
  // check fun default security group exist?
  let defaultSecurityGroup = await securityGroup.describeSecurityGroups(ecsClient, region, vpcId, defaultSecurityGroupName);
  debug('default security grpup: %j', defaultSecurityGroup);

  // create security group
  if (_.isEmpty(defaultSecurityGroup)) {

    console.log('\t\tcould not find default security group, ready to generate one');

    const securityGroupId = await securityGroup.createSecurityGroup(ecsClient, region, vpcId, defaultSecurityGroupName);

    console.log('\t\t\tsetting default security group rules');

    await securityGroup.authDefaultSecurityGroupRules(ecsClient, region, securityGroupId);

    console.log(green('\t\t\tdefault security group rules has been generated'));

    console.log(green('\t\tdefault security group has been generated, security group is: ' + securityGroupId));

    return securityGroupId;
  }  
  const securityGroupId = defaultSecurityGroup[0].SecurityGroupId;

  console.log(green('\t\tsecurity group already generated, security group is: ' + securityGroupId));

  return securityGroupId;
   
}

async function createDefaultVpcIfNotExist() {

  const profile = await getProfile();
  const region = profile.defaultRegion;

  const vpcClient = await getVpcPopClient();

  const ecsClient = await getEcsPopClient();

  const defaultVpcName = 'fc-fun-vpc';

  let vswitchIds;
  let vpcId;

  const funDefaultVpc = await findVpc(vpcClient, region, defaultVpcName);

  if (funDefaultVpc) { // update
    vswitchIds = funDefaultVpc.VSwitchIds.VSwitchId;
    vpcId = funDefaultVpc.VpcId;

    console.log(green('\t\tvpc already generated, vpcId is: ' + vpcId));
  } else { // create
    console.log('\t\tcould not find default vpc, ready to generate one');

    vpcId = await createVpc(vpcClient, region, defaultVpcName);

    console.log(green('\t\tdefault vpc has been generated, vpcId is: ' + vpcId));

  }

  debug('vpcId is %s', vpcId);

  const vswitchId = await createDefaultVSwitchIfNotExist(vpcClient, region, vpcId, vswitchIds);

  vswitchIds = [ vswitchId ];

  // create security

  const securityGroupId = await createDefaultSecurityGroupIfNotExist(ecsClient, region, vpcId);

  return {
    vpcId,
    vswitchIds,
    securityGroupId
  };
}

module.exports = {
  createDefaultVpcIfNotExist,
  findVpc,
  createVpc
};