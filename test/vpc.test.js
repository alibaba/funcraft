'use strict';

const vpc = require('../lib/vpc');
const expect = require('expect.js');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const region = 'cn-hangzhou';
const vpcName = 'test-vpc';
const vpcId = 'vpc-bp1dkyqjiu7hecg8j7jhe';

var requestOption = {
  method: 'POST'
};

describe('test findVpc', () => {

  afterEach(() => {
    sandbox.restore();
  });

  it('test find in first page', async () => {
    var params = {
      'RegionId': region,
      'PageSize': 50,
      'PageNumber': 1
    };

    const requestStub = sandbox.stub();

    requestStub.withArgs('DescribeVpcs', params, requestOption).resolves({
      'PageNumber': 1,
      'Vpcs': {
        'Vpc': [
          {
            'VpcName': vpcName
          }
        ]
      },
      'TotalCount': 3,
      'PageSize': 10
    });

    const vpcPopClient = { request: requestStub };

    const v = await vpc.findVpc(vpcPopClient, region, vpcName);

    expect(v).to.eql({ VpcName: 'test-vpc' });
  });

  it('test find in second page', async () => {
    var firstPageParams = {
      'RegionId': region,
      'PageSize': 50,
      'PageNumber': 1
    };

    var secondPageParams = {
      'RegionId': region,
      'PageSize': 50,
      'PageNumber': 2
    };

    const requestStub = sandbox.stub();

    requestStub.withArgs('DescribeVpcs', firstPageParams, requestOption).resolves({
      'PageNumber': 1,
      'Vpcs': {
        'Vpc': [
          {
            'VpcName': 'notfound'
          }
        ]
      },
      'TotalCount': 60,
      'PageSize': 50
    });

    requestStub.withArgs('DescribeVpcs', secondPageParams, requestOption).resolves({
      'PageNumber': 2,
      'Vpcs': {
        'Vpc': [
          {
            'VpcName': vpcName
          }
        ]
      },
      'TotalCount': 60,
      'PageSize': 50
    });

    const vpcPopClient = { request: requestStub };

    const v = await vpc.findVpc(vpcPopClient, region, vpcName);

    expect(v).to.eql({ VpcName: 'test-vpc' });

    assert.calledWith(requestStub.firstCall, 'DescribeVpcs', firstPageParams, requestOption);

    assert.calledWith(requestStub.secondCall, 'DescribeVpcs', secondPageParams, requestOption);
  });

  it('test not found', async () => {
    var firstPageParams = {
      'RegionId': region,
      'PageSize': 50,
      'PageNumber': 1
    };

    var secondPageParams = {
      'RegionId': region,
      'PageSize': 50,
      'PageNumber': 2
    };

    const requestStub = sandbox.stub();

    requestStub.withArgs('DescribeVpcs', firstPageParams, requestOption).resolves({
      'PageNumber': 1,
      'Vpcs': {
        'Vpc': [
          {
            'VpcName': 'notfound'
          }
        ]
      },
      'TotalCount': 60,
      'PageSize': 50
    });

    requestStub.withArgs('DescribeVpcs', secondPageParams, requestOption).resolves({
      'PageNumber': 2,
      'Vpcs': {
        'Vpc': [
          {
            'VpcName': 'not found'
          }
        ]
      },
      'TotalCount': 60,
      'PageSize': 50
    });

    const vpcPopClient = { request: requestStub };

    const v = await vpc.findVpc(vpcPopClient, region, vpcName);

    expect(v).to.be(undefined);

    assert.calledWith(requestStub.firstCall, 'DescribeVpcs', firstPageParams, requestOption);

    assert.calledWith(requestStub.secondCall, 'DescribeVpcs', secondPageParams, requestOption);

    assert.calledTwice(requestStub);
  });
});

describe('test createVpc', async () => {

  it('test create vpc', async () => {
    var createParams = {
      'RegionId': region,
      'CidrBlock': '10.0.0.0/8',
      'EnableIpv6': false,
      'VpcName': vpcName,
      'Description': 'default vpc created by fc fun'
    };

    const requestStub = sandbox.stub();

    requestStub.withArgs('CreateVpc', createParams, requestOption).resolves({
      'VpcId': vpcId
    });

    const describeParms = {
      'RegionId': region,
      'VpcId': vpcId
    };

    requestStub.withArgs('DescribeVpcs', describeParms, requestOption)
      .onCall(0).resolves({
        'Vpcs': {
          'Vpc': [
            {
              'Status': 'Pending'
            }
          ]
        }
      })
      .onCall(1).resolves({
        'Vpcs': {
          'Vpc': [
            {
              'Status': 'Available'
            }
          ]
        }
      });

    const vpcPopClient = { request: requestStub };

    const v = await vpc.createVpc(vpcPopClient, region, vpcName);

    expect(v).to.eql(vpcId);

    assert.calledWith(requestStub.firstCall, 'CreateVpc', createParams, requestOption);
    assert.calledWith(requestStub.secondCall, 'DescribeVpcs', describeParms, requestOption);
    assert.calledWith(requestStub.thirdCall, 'DescribeVpcs', describeParms, requestOption);
  });

  it('test create vpc timeout', async () => {
    var createParams = {
      'RegionId': region,
      'CidrBlock': '10.0.0.0/8',
      'EnableIpv6': false,
      'VpcName': vpcName,
      'Description': 'default vpc created by fc fun'
    };

    const requestStub = sandbox.stub();

    requestStub.withArgs('CreateVpc', createParams, requestOption).resolves({
      'VpcId': vpcId
    });

    const describeParms = {
      'RegionId': region,
      'VpcId': vpcId
    };

    requestStub.withArgs('DescribeVpcs', describeParms, requestOption)
      .resolves({
        'Vpcs': {
          'Vpc': [
            {
              'Status': 'Pending'
            }
          ]
        }
      });

    const vpcPopClient = { request: requestStub };

    try {
      await vpc.createVpc(vpcPopClient, region, vpcName);
      assert.fail('create vpc should not success');
    } catch (e) {
      expect(e.message).to.eql(`Timeout while waiting for vpc vpc-bp1dkyqjiu7hecg8j7jhe status to be 'Available'`);

      assert.calledWith(requestStub.firstCall, 'CreateVpc', createParams, requestOption);
      assert.callCount(requestStub, 1 + 15); // 1 CreateVpc, 15 DescribeVpcs
    }
  });
});

