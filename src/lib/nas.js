'use strict';

const fs = require('fs-extra');
const tpl = require('./tpl');
const path = require('path');
const debug = require('debug')('fun:nas');
const constants = require('./nas/constants');
const definition = require('./definition');
const getProfile = require('./profile').getProfile;
const getAvailableVSwitchId = require('./vswitch').getAvailableVSwitchId;

const { green } = require('colors');
const { sleep } = require('./time');
const { getNasPopClient, getVpcPopClient } = require('./client');
const { throwProcessedException } = require('./error-message');

const _ = require('lodash');

const requestOption = {
  method: 'POST'
};

const NAS_DEFAULT_DESCRIPTION = 'default_nas_created_by_fc_fun';

async function createMountTarget(nasClient, region, fileSystemId, vpcId, vswitchId) {
  const params = {
    'RegionId': region,
    'NetworkType': 'Vpc',
    'FileSystemId': fileSystemId,
    'AccessGroupName': 'DEFAULT_VPC_GROUP_NAME',
    'VpcId': vpcId,
    'VSwitchId': vswitchId
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

  if (status !== 'Active') { throw new Error(`Timeout while waiting for MountPoint ${mountTargetDomain} status to be 'Active'`); }
}

async function createDefaultNasIfNotExist(vpcId, vswitchIds) {
  const nasClient = await getNasPopClient();
  const vpcClient = await getVpcPopClient();

  const profile = await getProfile();
  const region = profile.defaultRegion;

  const nasZones = await describeNasZones(nasClient, region);

  const { zoneId, vswitchId, storageType } = await getAvailableVSwitchId(vpcClient, region, vswitchIds, nasZones);

  const fileSystemId = await createNasFileSystemIfNotExist(nasClient, region, zoneId, storageType);

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

async function createNasFileSystemIfNotExist(nasClient, region, zoneId, storageType) {
  let fileSystemId = await findNasFileSystem(nasClient, region, NAS_DEFAULT_DESCRIPTION);

  if (!fileSystemId) {
    console.log('\t\tcould not find default nas file system, ready to generate one');

    fileSystemId = await createNasFileSystem({ nasClient, region, zoneId, storageType });

    console.log(green('\t\tdefault nas file system has been generated, fileSystemId is: ' + fileSystemId));
  } else {
    console.log(green('\t\tnas file system already generated, fileSystemId is: ' + fileSystemId));
  }

  return fileSystemId;
}

async function findNasFileSystem(nasClient, region, description) {

  const pageSize = 50;
  let requestPageNumber = 0;
  let totalCount;
  let pageNumber;

  let fileSystem;

  do {
    const params = {
      'RegionId': region,
      'PageSize': pageSize,
      'PageNumber': ++requestPageNumber
    };

    var rs;
    try {
      rs = await nasClient.request('DescribeFileSystems', params, requestOption);
    } catch (ex) {
      throwProcessedException(ex, 'AliyunNASFullAccess');
    }

    totalCount = rs.TotalCount;
    pageNumber = rs.PageNumber;

    const fileSystems = rs.FileSystems.FileSystem;

    fileSystem = _.find(fileSystems, { Description: description });

    debug('find filesystem: ' + JSON.stringify(fileSystem));

  } while (!fileSystem && totalCount && pageNumber && pageNumber * pageSize < totalCount);

  return (fileSystem || {}).FileSystemId;
}

async function createNasFileSystem({
  nasClient,
  region,
  storageType,
  zoneId
}) {
  const params = {
    'RegionId': region,
    'ProtocolType': 'NFS',
    'StorageType': storageType,
    'Description': NAS_DEFAULT_DESCRIPTION,
    'ZoneId': zoneId
  };

  const rs = await nasClient.request('CreateFileSystem', params, requestOption);

  return rs.FileSystemId;
}

async function generateAutoNasConfig(serviceName, vpcId, vswitchIds, userId, groupId) {
  const mountPointDomain = await createDefaultNasIfNotExist(vpcId, vswitchIds);

  //fun nas 创建的服务名比其对应的服务多了 '_FUN_NAS_' 前缀
  //对于 nas 的挂载目录，要去掉这个前缀，保证 fun nas 的服务与对应的服务使用的是同样的挂载目录
  if (serviceName.startsWith(constants.FUN_NAS_SERVICE_PREFIX)) {
    serviceName = serviceName.substring(constants.FUN_NAS_SERVICE_PREFIX.length);
  }
  return {
    UserId: userId || 10003,
    GroupId: groupId || 10003,
    MountPoints: [
      {
        ServerAddr: `${mountPointDomain}:/${serviceName}`,
        MountDir: '/mnt/auto'
      }
    ]
  };
}

const serverAddrReGe = /^[a-z0-9-.]*.nas.[a-z]+.com:\//;

function resolveMountPoint(mountPoint) {
  // '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/'
  const serverAddr = mountPoint.ServerAddr;
  const mountDir = mountPoint.MountDir;

  // valid serverAddr
  if (!serverAddrReGe.test(serverAddr)) {
    throw new Error(`NasConfig's nas server address '${serverAddr}' doesn't match expected format (allowed: '^[a-z0-9-.]*.nas.[a-z]+.com:/')`);
  }

  const suffix = '.com:';
  const index = serverAddr.lastIndexOf(suffix);

  // /
  let mountSource = serverAddr.substr(index + suffix.length);
  // 012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com
  let serverPath = serverAddr.substr(0, serverAddr.length - mountSource.length - 1);

  return {
    serverPath,
    mountSource,
    mountDir,
    serverAddr
  };
}

async function convertMountPointToNasMapping(nasBaseDir, mountPoint) {
  const { mountSource, mountDir, serverPath } = resolveMountPoint(mountPoint);

  const nasDir = path.join(nasBaseDir, serverPath);

  if (!(await fs.pathExists(nasDir))) {
    await fs.ensureDir(nasDir);
  }

  const localNasDir = path.join(nasDir, mountSource);

  // The mounted nas directory must exist.
  if (!(await fs.pathExists(localNasDir))) {
    await fs.ensureDir(localNasDir);
  }

  return {
    localNasDir,
    remoteNasDir: mountDir
  };
}

async function convertMountPointsToNasMappings(nasBaseDir, mountPoints) {
  if (!mountPoints) { return []; }

  const nasMappings = [];

  for (let mountPoint of mountPoints) {
    const nasMapping = await convertMountPointToNasMapping(nasBaseDir, mountPoint);

    nasMappings.push(nasMapping);
  }

  return nasMappings;
}

async function convertNasConfigToNasMappings(nasBaseDir, nasConfig, serviceName) {
  if (!nasConfig) { return []; }

  const isNasAuto = definition.isNasAutoConfig(nasConfig);

  if (isNasAuto) { // support 'NasConfig: Auto'
    const nasDir = path.join(nasBaseDir, 'auto-default');

    const localNasDir = path.join(nasDir, serviceName);

    if (!(await fs.pathExists(localNasDir))) {
      await fs.ensureDir(localNasDir);
    }

    return [{
      localNasDir,
      remoteNasDir: '/mnt/auto'
    }];
  }
  const mountPoints = nasConfig.MountPoints;

  return await convertMountPointsToNasMappings(nasBaseDir, mountPoints);
}

async function convertTplToServiceNasMappings(nasBaseDir, tpl) {
  const serviceNasMappings = {};

  for (const { serviceName, serviceRes } of definition.findServices(tpl.Resources)) {
    const nasConfig = (serviceRes.Properties || {}).NasConfig;

    const nasMappings = await convertNasConfigToNasMappings(nasBaseDir, nasConfig, serviceName);

    serviceNasMappings[serviceName] = nasMappings;
  }

  return serviceNasMappings;
}

function convertTplToServiceNasIdMappings(tpl) {
  const serviceNasIdMappings = {};

  for (const { serviceName, serviceRes } of definition.findServices(tpl.Resources)) {
    const nasConfig = (serviceRes.Properties || {}).NasConfig;
    var nasId;
    if (nasConfig === undefined) {
      nasId = {};
    } else {
      nasId = getNasIdFromNasConfig(nasConfig);
    }

    serviceNasIdMappings[serviceName] = nasId;
  }

  return serviceNasIdMappings;
}

function getNasIdFromNasConfig(nasConfig) {
  const { userId, groupId } = definition.getUserIdAndGroupId(nasConfig);
  return {
    UserId: userId,
    GroupId: groupId
  };
}

function getDefaultNasDir(baseDir) {
  return path.join(baseDir, tpl.DEFAULT_NAS_PATH_SUFFIX);
}

async function getNasFileSystems(nasClient, region) {
  const pageSize = 50;
  let requestPageNumber = 0;
  let totalCount;
  let pageNumber;

  let fileSystems = [];

  do {
    const params = {
      'RegionId': region,
      'PageSize': pageSize,
      'PageNumber': ++requestPageNumber
    };

    var rs;
    try {
      rs = await nasClient.request('DescribeFileSystems', params, requestOption);
    } catch (ex) {
      throwProcessedException(ex, 'AliyunNASFullAccess');
    }

    totalCount = rs.TotalCount;
    pageNumber = rs.PageNumber;

    fileSystems.push((rs.FileSystems || {}).FileSystem);

    debug('find fileSystems: ' + JSON.stringify(fileSystems));

  } while (totalCount && pageNumber && pageNumber * pageSize < totalCount);

  return fileSystems;
}

const FAST_NAS_STORAGE_TYPE = ['standard', 'advance'];

async function getAvailableNasFileSystems(nasClient) {
  const profile = await getProfile();
  const fileSystems = await getNasFileSystems(nasClient, profile.defaultRegion);
  return _.flatten(fileSystems)
    .reduce((acc, cur) => {

      if ((cur.Description || '').indexOf('cloudshell') !== -1 || _.includes(FAST_NAS_STORAGE_TYPE, cur.StorageType)) {
        return acc;
      }
      const mountTargets = cur.MountTargets || {};

      const availableMounts = [];
      for (const m of mountTargets.MountTarget) {
        if (m.Status === 'active' && m.NetworkType === 'vpc') { // 可用的, 非经典网络
          availableMounts.push(m);
        }
      }
      acc.push({
        fileSystemId: cur.FileSystemId,
        description: cur.Description,
        storageType: cur.StorageType,
        zoneId: cur.ZoneId,
        mountTargets: availableMounts
      });
      return acc;
    }, []);
}

async function describeNasZones(nasClient, region) {
  const params = {
    'RegionId': region
  };

  const zones = await nasClient.request('DescribeZones', params, requestOption);
  return zones.Zones.Zone;
}

module.exports = {
  findNasFileSystem,
  findMountTarget,
  createMountTarget,
  generateAutoNasConfig,
  resolveMountPoint,
  convertMountPointToNasMapping,
  convertNasConfigToNasMappings,
  convertTplToServiceNasMappings,
  convertTplToServiceNasIdMappings,
  getNasIdFromNasConfig,
  getDefaultNasDir,
  getAvailableNasFileSystems,
  describeNasZones
};