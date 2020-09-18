'use strict';

const _ = require('lodash');

const debug = require('debug')('fun:nas');

const { red } = require('colors');
const { getProfile } = require('./profile');
const { getFcClient, getNasPopClient } = require('./client');
const { promptForConfirmContinue } = require('./init/prompt');

var requestOption = {
  method: 'POST'
};

async function createDefaultVSwitch(vpcClient, region, vpcId, vswitchName) {
  const vswitchZoneId = await selectAllowedVSwitchZone(vpcClient, region);

  var vswitchId;
  try {
    // 创建 vswitch
    vswitchId = await createVSwitch(vpcClient, {
      region,
      vpcId,
      zoneId: vswitchZoneId,
      vswitchName: vswitchName
    });
  } catch (ex) {
    throw ex;
  }
  return vswitchId;
}

async function describeVSwitchAttributes(vpcClient, region, vswitchId) {
  const params = {
    'RegionId': region,
    'VSwitchId': vswitchId
  };
  return await vpcClient.request('DescribeVSwitchAttributes', params, requestOption);
}

async function getVSwitchZoneId(vpcClient, region, vswitchId) {
  const describeRs = await describeVSwitchAttributes(vpcClient, region, vswitchId);
  return (describeRs || {}).ZoneId;
}

async function getVSwitchName(vpcClient, region, vswitchId) {
  const describeRs = await describeVSwitchAttributes(vpcClient, region, vswitchId);
  return (describeRs || {}).VSwitchName;
}

async function findVswitchExistByName(vpcClient, region, vswitchIds, searchVSwtichName) {

  if (!_.isEmpty(vswitchIds)) {
    for (let vswitchId of vswitchIds) {

      const vswitchName = await getVSwitchName(vpcClient, region, vswitchId);

      if (_.isEqual(searchVSwtichName, vswitchName)) {
        debug('found default vswitchId: ' + vswitchId);

        return vswitchId;
      }
    }
  }

  debug('could not find %s from %j for region %s', searchVSwtichName, vswitchIds, region);

  return null;
}

async function createVSwitch(vpcClient, {
  region,
  vpcId,
  zoneId,
  vswitchName
}) {
  var params = {
    'RegionId': region,
    'VpcId': vpcId,
    'ZoneId': zoneId,
    'CidrBlock': '10.20.0.0/16',
    'VSwitchName': vswitchName,
    'Description': 'default vswitch created by fc fun'
  };

  debug('createVSwitch params is %j', params);

  const createRs = await vpcClient.request('CreateVSwitch', params, requestOption);

  return createRs.VSwitchId;
}

function takeIntersection(vpcZones, fcAllowedZones, nasZones) {

  const threeIntersection = _.filter(vpcZones, z => {
    return _.includes(fcAllowedZones, z.ZoneId) && _.includes(nasZones.map(zone => { return zone.ZoneId; }), z.ZoneId);
  });

  if (!_.isEmpty(threeIntersection)) {
    return threeIntersection;
  }

  return _.filter(vpcZones, z => {
    return _.includes(fcAllowedZones, z.ZoneId);
  });
}

async function selectVSwitchZoneId(fcAllowedZones, vpcZones, nasZones) {

  const allowedZones = takeIntersection(vpcZones, fcAllowedZones, nasZones);

  const sortedZones = _.sortBy(allowedZones, ['ZoneId']);

  return (_.head(sortedZones) || {}).ZoneId;
}

async function getFcAllowedZones() {
  const fc = await getFcClient();

  const fcRs = await fc.getAccountSettings();

  const fcAllowedZones = fcRs.data.availableAZs;

  debug('fc allowed zones: %j', fcAllowedZones);

  if (_.isEqual(fcAllowedZones, [''])) {

    const profile = await getProfile();

    throw new Error(red(`No fc vswitch zones allowed, you may need login to fc console to apply for VPC feature: https://fc.console.aliyun.com/overview/${profile.defaultRegion}`));
  }

  return fcAllowedZones;
}

async function selectAllowedVSwitchZone(vpcClient, region) {
  const nasClient = await getNasPopClient();

  const fcAllowedZones = await getFcAllowedZones();
  const vpcZones = await describeVpcZones(vpcClient, region);
  const nasZones = await require('./nas').describeNasZones(nasClient, region);

  const usedZoneId = await selectVSwitchZoneId(fcAllowedZones, vpcZones, nasZones);

  if (!usedZoneId) {
    throw new Error('no availiable zone for vswitch');
  }

  debug('select allowed switch zone: ', usedZoneId);

  return usedZoneId;
}

async function describeVpcZones(vpcClient, region) {
  const params = {
    'RegionId': region
  };

  const zones = await vpcClient.request('DescribeZones', params, requestOption);
  return zones.Zones.Zone;
}

async function convertToFcAllowedZones(vpcClient, region, vswitchIds) {
  const fcAllowedZones = await getFcAllowedZones();

  const fcZones = [];
  for (const vswitchId of vswitchIds) {
    const zoneId = await getVSwitchZoneId(vpcClient, region, vswitchId);
    if (_.includes(fcAllowedZones, zoneId)) {
      fcZones.push({ zoneId, vswitchId });
    }
  }
  if (_.isEmpty(fcZones)) {
    throw new Error(`
Only zoneId ${fcAllowedZones} of vswitch is allowed by VpcConfig.
Check your vswitch zoneId please.`);
  }

  return fcZones;
}

function convertZones(nasZones, zones, storageType = 'Performance') {
  const zoneId = nasZones.ZoneId;
  const vswitchId = zones.filter(f => { return f.zoneId === zoneId; });
  return {
    zoneId,
    vswitchId: _.head(vswitchId).vswitchId,
    storageType
  };
}

function processDifferentZones(nasZones, FcAllowVswitchId) {

  const performance = _.find(nasZones, nasZone => !_.isEmpty(nasZone.Performance.Protocol));

  if (!_.isEmpty(performance)) {

    return {
      zoneId: performance.ZoneId,
      vswitchId: FcAllowVswitchId,
      storageType: 'Performance'
    };
  }

  const capacity = _.find(nasZones, nasZone => !_.isEmpty(nasZone.Capacity.Protocol));

  if (!_.isEmpty(capacity)) {
    return {
      zoneId: capacity.ZoneId,
      vswitchId: FcAllowVswitchId,
      storageType: 'Capacity'
    };
  }

  return null;
}

async function getAvailableVSwitchId(vpcClient, region, vswitchIds, nasZones) {

  const fcZones = await convertToFcAllowedZones(vpcClient, region, vswitchIds);

  const availableZones = fcZones.filter(fcZone => { return _.includes(nasZones.map(m => { return m.ZoneId; }), fcZone.zoneId); });

  const performances = [];
  const capacities = [];

  _.forEach(nasZones, nasZone => {
    if (_.includes(availableZones.map(z => z.zoneId), nasZone.ZoneId)) {
      if (!_.isEmpty(nasZone.Performance.Protocol)) { performances.push(nasZone); }
      if (!_.isEmpty(nasZone.Capacity.Protocol)) { capacities.push(nasZone); }
    }
  });

  if (!_.isEmpty(performances)) {
    return convertZones(_.head(performances), availableZones);
  }

  if (!_.isEmpty(capacities)) {
    const msg = `Region ${region} only supports capacity NAS. Do you want to create it automatically?`;
    const yes = await promptForConfirmContinue(msg);
    if (yes) { return convertZones(_.head(capacities), availableZones, 'Capacity'); }
    throw new Error(`No NAS service available under region ${region}.`);
  }

  return processDifferentZones(nasZones, _.head(fcZones).vswitchId);
}

module.exports = {
  findVswitchExistByName,
  selectVSwitchZoneId,
  createVSwitch,
  createDefaultVSwitch,
  getAvailableVSwitchId
};