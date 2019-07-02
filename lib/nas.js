'use strict'

const getProfile = require('./profile').getProfile;
const { getNasPopClient } = require('./client');
const _ = require('lodash');
const debug = require('debug')('fun:nas');

var requestOption = {
  method: 'POST'
};

const NAS_DEFAULT_DESCRIPTION = 'default nas created by fc fun';

async function createMountTarget(nasClient, region, fileSystemId, vpcId, vswitchId) {
  const params = {
    "RegionId": region,
    "NetworkType": "Vpc",
    "FileSystemId": fileSystemId,
    "AccessGroupName": "DEFAULT_VPC_GROUP_NAME",
    "VpcId": vpcId,
    "VSwitchId": vswitchId
  };
  
  var requestOption = {
    method: 'POST'
  };

  const rs = await nasClient.request('CreateMountTarget', params, requestOption);    

  debug("create mount target rs: %s", rs);

  return rs.MountTargetDomain;
}

async function createDefaultNasIfNotExist(vpcId, vswitchId) {
  const nasClient = await getNasPopClient();

  const profile = await getProfile();
  const region = profile.defaultRegion;

  const fileSystemId = await createNasFileSystemIfNotExist(nasClient, region);

  console.log("fileSystemId: " + fileSystemId);

  return await createMountTargetIfNotExist(nasClient, region, fileSystemId, vpcId, vswitchId);  
}

async function findMountTarget(nasClient, region, fileSystemId, vpcId, vswitchId) {
  var params = {
    "RegionId": region,
    "FileSystemId": fileSystemId
  };

  const rs = await nasClient.request('DescribeMountTargets', params, requestOption);

  const mountTargets = rs.MountTargets.MountTarget;

  // todo: 检查 mountTargets 的 vswitch 是否与函数计算的一致？

  if (!_.isEmpty(mountTargets)) {

    const mountTarget = _.find(mountTargets, {
      "VpcId": vpcId,
      "VswId": vswitchId
    });

    if (mountTarget) { 
      return mountTarget.MountTargetDomain;
    }
  } 

  return null;
}

async function createMountTargetIfNotExist(nasClient, region, fileSystemId, vpcId, vswitchId) {
  let mountTargetDomain = await findMountTarget(nasClient, region, fileSystemId, vpcId, vswitchId);
  
  if (mountTargetDomain) return mountTargetDomain;

  // create mountTarget if not exist

  mountTargetDomain = await createMountTarget(nasClient, region, fileSystemId, vpcId, vswitchId);
  console.log("mountTargetDomian: " + JSON.stringify(mountTargetDomain));  

  return mountTargetDomain;
}

async function createNasFileSystemIfNotExist(nasClient, region) {
  let fileSystemId = await findNasFileSystem(nasClient, region, NAS_DEFAULT_DESCRIPTION);

  if (!fileSystemId) {
    fileSystemId = await createNasFileSystem(nasClient, region);
  }

  return fileSystemId;
}

async function findNasFileSystem(nasClient, region, description) {

  // todo: pageable
  const pageSize = 1000;

  var params = {
    "RegionId": region,
    "PageSize": pageSize
  }
  
  var requestOption = {
    method: 'POST'
  };
  
  const rs = await nasClient.request('DescribeFileSystems', params, requestOption);

  const fileSystems = rs.FileSystems.FileSystem;

  const fileSystem = _.find(fileSystems, { Description: description });

  debug("find filesystem: " + JSON.stringify(fileSystem));

  if (fileSystem) return fileSystem.FileSystemId
  else return null;
}

async function createNasFileSystem(nasClient, region) {
  var params = {
    "RegionId": region,
    "ProtocolType": "NFS",
    "StorageType": "Performance",
    "Description": NAS_DEFAULT_DESCRIPTION
  };

  const rs = await nasClient.request('CreateFileSystem', params, requestOption);  
  return rs.FileSystemId;
}

module.exports = {
  createDefaultNasIfNotExist,
  findNasFileSystem,
  findMountTarget,
  createMountTarget
};