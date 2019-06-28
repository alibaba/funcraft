'use strict'

const _ = require('lodash');

const { getFcClient } = require('./client');

var requestOption = {
  method: 'POST'
};

async function createDefaultVSwitch(vpcClient, region, vpcId, vswitchName) {
  const vswitchZoneId = await selectAllowedVSwitchZone(vpcClient, region);

  // 创建 vswitch
  const vswitchId = await createVSwitch(vpcClient, {
    region,
    vpcId,
    zoneId: vswitchZoneId,
    vswitchName: vswitchName,
  });

  return vswitchId;
}

async function getVSwitchName(vpcClient, region, vswitchId) {
  var params = {
    "RegionId": region,
    "VSwitchId": vswitchId
  };

  const describeRs = await vpcClient.request('DescribeVSwitchAttributes', params, requestOption);
  const vswitchName = describeRs.VSwitchName;

  return vswitchName;
}

async function findVswitchExistByName(vpcClient, region, vswitchIds, searchVSwtichName) {

  if (!_.isEmpty(vswitchIds)) {
    for (let vswitchId of vswitchIds) {

      const vswitchName = await getVSwitchName(vpcClient, region, vswitchId);

      if (_.isEqual(searchVSwtichName, vswitchName)) {
        console.log("##### found default vswitchId: " + vswitchId);

        return vswitchId;
      }
    }
  }

  console.log("##### need to create vswitch");

  return null;
}

async function createVSwitch(vpcClient, {
  region,
  vpcId,
  zoneId,
  vswitchName
}) {
  var params = {
    "RegionId": region,
    "VpcId": vpcId,
    "ZoneId": zoneId,
    "CidrBlock": "10.20.0.0/16",
    "VSwitchName": vswitchName,
    "Description": 'default vswitch created by fc fun'
  };

  console.log("createVSwitch params is " + JSON.stringify(params));

  // todo: check error
  const createRs = await vpcClient.request('CreateVSwitch', params, requestOption);

  return createRs.VSwitchId;
}

async function selectVSwitchZoneId(fcAllowedZones, zones) {

  const allowedZones = _.filter(zones, z => _.includes(fcAllowedZones, z.ZoneId));

  const sortedZones = _.sortBy(allowedZones, ['ZoneId']);
  
  return _.head(sortedZones).ZoneId;

  // todo: 
  // const zone = _.find(sortedZones, (z) => {
  //   if (!_.has(z, ['AvailableResourceCreation', 'ResourceTypes'])) return false;

  //   const resourceTypes = z.AvailableResourceCreation.ResourceTypes;

  //   return _.includes(resourceTypes, 'VSwitch');
  // });

  // if (zone) {
  //   console.log("zoneId is: " + JSON.stringify(zone.ZoneId));
  //   return zone.ZoneId;
  // } else {
  //   return null;
  // }

}

async function getFcAllowedZones() {
  const fc = await getFcClient();

  const fcRs = await fc.getAccountSettings();

  const fcAllowedZones = fcRs.data.availableAZs;

  console.log("fcRs: " + JSON.stringify(fcAllowedZones));

  return fcAllowedZones;
}

async function selectAllowedVSwitchZone(vpcClient, region) {
  // 查询 zone
  // todo: invalid region
  // 这里 open api 提示使用的是 vpc 的 endpoint，但是没有是否可以创建 vswitch 的信息，所以，这里使用 ecs 的 endpoint
  const zones = await describeZones(vpcClient, region);

  // todo: check zones not empty    

  const fcAllowedZones = await getFcAllowedZones();

  const usedZoneId = await selectVSwitchZoneId(fcAllowedZones, zones);

  if (!usedZoneId) {
    throw new Error("no availiable zone for vswitch");
  }

  console.log("usedZoneId: " + usedZoneId);

  return usedZoneId;
}

async function describeZones(vpcClient, region) {
  const params = {
    "RegionId": region
  };

  const zones = await vpcClient.request('DescribeZones', params, requestOption);
  return zones.Zones.Zone;
}

module.exports = {
  findVswitchExistByName,
  selectVSwitchZoneId,
  createVSwitch,
  createDefaultVSwitch
};