'use strict'; 

const expect = require('expect.js');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const vswitch = require('../lib/vswitch');

const requestOption = {
  method: 'POST'
};

const defualtVSwitchName = 'fc-fun-vswitch-1';
const vpcId = 'vpc-bp1me4doa1zk2mwhksx4q';
const hangzhouZoneId = 'cn-hangzhou-g';

const region = 'cn-hangzhou';

describe('test selectVSwitchZoneId', async () => {

  afterEach(() => {
    sandbox.restore();
  });

  it('test no allowed zone ', async () => {
    const fcAllowedzones = ['cn-hangzhou-g'];
    const vpcZones = [
      {
        'ZoneId': 'cn-hangzhou-b',
        'LocalName': '华东 1 可用区 B'
      },
      {
        'ZoneId': 'cn-hangzhou-d',
        'LocalName': '华东 1 可用区 D'
      }
    ];

    const rs = await vswitch.selectVSwitchZoneId(fcAllowedzones, vpcZones);
    expect(rs).to.be(undefined);
  });

  it('test one allowed zone', async () => {
    const fcAllowedzones = ['cn-hangzhou-g'];
    const vpcZones = [
      {
        'ZoneId': 'cn-hangzhou-b',
        'LocalName': '华东 1 可用区 B'
      },
      {
        'ZoneId': 'cn-hangzhou-d',
        'LocalName': '华东 1 可用区 D'
      },
      {
        'ZoneId': 'cn-hangzhou-g',
        'LocalName': '华东 1 可用区 G'
      }
    ];

    const rs = await vswitch.selectVSwitchZoneId(fcAllowedzones, vpcZones);
    expect(rs).to.eql('cn-hangzhou-g');
  });
});

describe('test findVSwitchExistByName', async () => {

  afterEach(() => {
    sandbox.restore();
  });

  it('test none', async () => {
    const vpcPopClient = { request: sandbox.stub() };

    const searchRs = await vswitch.findVswitchExistByName(vpcPopClient, 'cn-hangzhou', [], 'test');
    expect(searchRs).to.eql(null);
  });

  it('test findVSwitchExistByName', async () => {
    const requestStub = sandbox.stub();

    const params = {
      'RegionId': region,
      'VSwitchId': 'vsw-bp1h9eryqi6fjor4qvmor'
    };

    requestStub.withArgs('DescribeVSwitchAttributes',
      params, requestOption).resolves({
      'VSwitchName': defualtVSwitchName
    });

    const vpcPopClient = { request: requestStub };

    const vswitchIds = ['vsw-bp1h9eryqi6fjor4qvmor'];

    const searchRs = await vswitch.findVswitchExistByName(vpcPopClient, region, vswitchIds, defualtVSwitchName);
    expect(searchRs).to.eql('vsw-bp1h9eryqi6fjor4qvmor');

    assert.calledWith(requestStub, 'DescribeVSwitchAttributes', params, requestOption);
  });
});

describe('test createVSwitch', async () => {

  afterEach(() => {
    sandbox.restore();
  });

  it('test createVSwitch', async () => {
    const params = {
      'RegionId': region,
      'VpcId': vpcId,
      'ZoneId': hangzhouZoneId,
      'CidrBlock': '10.20.0.0/16',
      'VSwitchName': defualtVSwitchName,
      'Description': 'default vswitch created by fc fun'
    };

    const requestStub = sandbox.stub();

    requestStub.withArgs('CreateVSwitch',
      params, requestOption).resolves({
      'VSwitchId': 'vsw-25naue4gz'
    });

    const vpcPopClient = { request: requestStub };

    const vswitchId = await vswitch.createVSwitch(vpcPopClient, {
      region,
      vpcId,
      zoneId: hangzhouZoneId,
      vswitchName: defualtVSwitchName
    });

    expect(vswitchId).to.eql('vsw-25naue4gz');

    assert.calledWith(requestStub, 'CreateVSwitch', params, requestOption);
  });

});