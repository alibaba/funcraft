'use strict';

const getProfile = require('./profile').getProfile;
const { getNasPopClient } = require('./client');
const _ = require('lodash');
const debug = require('debug')('fun:nas');
const { green } = require('colors');
const { sleep } = require('./time');

var requestOption = {
  method: 'POST'
};

const NAS_DEFAULT_DESCRIPTION = 'default nas created by fc fun';

async function createMountTarget(nasClient, region, fileSystemId, vpcId, vswitchId) {
  const params = {
    'RegionId': region,
    'NetworkType': 'Vpc',
    'FileSystemId': fileSystemId,
    'AccessGroupName': 'DEFAULT_VPC_GROUP_NAME',
    'VpcId': vpcId,
    'VSwitchId': vswitchId
  };

  var requestOption = {
    method: 'POST'
  };

  const rs = await nasClient.request('CreateMountTarget', params, requestOption);    

  const mountTargetDomain = rs.MountTargetDomain;

  debug('create mount target rs: %s', mountTargetDomain);

  await waitMountPointUntilAvaliable(nasClient, region, fileSystemId, mountTargetDomain);

  return mountTargetDomain;
}

async function waitMountPointUntilAvaliable(nasClient, region, fileSystemId, mountTargetDomain) {
  let count = 0;
  let status;

  do {
    count++;

    var params = {
      'RegionId': region, 
      'FileSystemId': fileSystemId,
      'MountTargetDomain': mountTargetDomain
    };
    
    await sleep(800);

    const rs = await nasClient.request('DescribeMountTargets', params, requestOption);
    
    status = rs.MountTargets.MountTarget[0].Status;
    
    debug('nas status is: ' + status);

    console.log(`\t\tnas mount target domain already created, waiting for status to be 'Active', now is ${status}`);
    
  } while (count < 15 && status !== 'Active');
}

async function createDefaultNasIfNotExist(vpcId, vswitchId) {
  const nasClient = await getNasPopClient();

  const profile = await getProfile();
  const region = profile.defaultRegion;

  const fileSystemId = await createNasFileSystemIfNotExist(nasClient, region);

  debug('fileSystemId: %s', fileSystemId);

  return await createMountTargetIfNotExist(nasClient, region, fileSystemId, vpcId, vswitchId);  
}

async function findMountTarget(nasClient, region, fileSystemId, vpcId, vswitchId) {
  var params = {
    'RegionId': region,
    'FileSystemId': fileSystemId
  };

  const rs = await nasClient.request('DescribeMountTargets', params, requestOption);

  const mountTargets = rs.MountTargets.MountTarget;

  // todo: 检查 mountTargets 的 vswitch 是否与函数计算的一致？

  if (!_.isEmpty(mountTargets)) {

    const mountTarget = _.find(mountTargets, {
      'VpcId': vpcId,
      'VswId': vswitchId
    });

    if (mountTarget) { 
      return mountTarget.MountTargetDomain;
    }
  } 

  return null;
}

async function createMountTargetIfNotExist(nasClient, region, fileSystemId, vpcId, vswitchId) {
  let mountTargetDomain = await findMountTarget(nasClient, region, fileSystemId, vpcId, vswitchId);
  
  if (mountTargetDomain) { 
    console.log(green('\t\tnas file system mount target is already created, mountTargetDomain is: ' + mountTargetDomain));

    return mountTargetDomain; 
  }

  // create mountTarget if not exist

  console.log('\t\tcould not find default nas file system mount target, ready to generate one');

  mountTargetDomain = await createMountTarget(nasClient, region, fileSystemId, vpcId, vswitchId);

  console.log(green('\t\tdefault nas file system mount target has been generated, mount domain is: ' + mountTargetDomain));

  return mountTargetDomain;
}

async function createNasFileSystemIfNotExist(nasClient, region) {
  let fileSystemId = await findNasFileSystem(nasClient, region, NAS_DEFAULT_DESCRIPTION);

  if (!fileSystemId) {
    console.log('\t\tcould not find default nas file system, ready to generate one');

    fileSystemId = await createNasFileSystem(nasClient, region);

    console.log(green('\t\tdefault nas file system has been generated, fileSystemId is: ' + fileSystemId));
  } else {
    console.log(green('\t\tnas file system already generated, fileSystemId is: ' + fileSystemId));
  }

  return fileSystemId;
}

async function findNasFileSystem(nasClient, region, description) {

  // todo: pageable
  const pageSize = 1000;

  var params = {
    'RegionId': region,
    'PageSize': pageSize
  };
  
  var requestOption = {
    method: 'POST'
  };
  
  const rs = await nasClient.request('DescribeFileSystems', params, requestOption);

  const fileSystems = rs.FileSystems.FileSystem;

  const fileSystem = _.find(fileSystems, { Description: description });

  debug('find filesystem: ' + JSON.stringify(fileSystem));

  if (fileSystem) { return fileSystem.FileSystemId; }
  return null;
}

async function createNasFileSystem(nasClient, region) {
  var params = {
    'RegionId': region,
    'ProtocolType': 'NFS',
    'StorageType': 'Performance',
    'Description': NAS_DEFAULT_DESCRIPTION
  };

  const rs = await nasClient.request('CreateFileSystem', params, requestOption);  
  return rs.FileSystemId;
}

async function generateAutoNasConfig(serviceName, vpcId, vswitchId) {
  const mountPointDomain = await createDefaultNasIfNotExist(vpcId, vswitchId);

  return {
    UserId: 10007,
    GroupId: 10007,
    MountPoints: [
      {
        ServerAddr: `${mountPointDomain}:/${serviceName}`,
        MountDir: '/mnt/nas/auto'
      }
    ]
  };
}

module.exports = {
  findNasFileSystem,
  findMountTarget,
  createMountTarget,
  generateAutoNasConfig
};