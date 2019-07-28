'use strict';

const expect = require('expect.js');
let nas = require('../lib/nas');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const region = 'cn-hangzhou';

var requestOption = {
  method: 'POST'
};

describe.only('test findNasFileSystem', async () => {

  afterEach(() => {
    sandbox.restore();
  });

  it('test find in first page', async () => {
    const description = 'test';

    const params = {
      'RegionId': region,
      'PageSize': 50,
      'PageNumber': 1
    };

    const requestStub = sandbox.stub();

    requestStub.withArgs('DescribeFileSystems', params, requestOption).resolves({
      'FileSystems': {
        'FileSystem': [
          {
            'Description': description,
            'FileSystemId': '109c042666',
            'RegionId': 'cn-hangzhou',
            'MeteredSize': 1611661312
          }
        ]
      },
      'TotalCount': 3,
      'PageSize': 10,
      'PageNumber': 1
    });

    const nasPopClient = { request: requestStub };

    const findSystemId = await nas.findNasFileSystem(nasPopClient, region, description);

    expect(findSystemId).to.eql('109c042666');

    assert.calledWith(requestStub, 'DescribeFileSystems', params, requestOption);
  });

  it('test find in second page', async () => {
    const description = 'test';

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

    requestStub.withArgs('DescribeFileSystems', firstPageParams, requestOption).resolves({
      'FileSystems': {
        'FileSystem': [
          {
            'Description': 'not found'
          }
        ]
      },
      'TotalCount': 60,
      'PageSize': 50,
      'PageNumber': 1  
    });

    requestStub.withArgs('DescribeFileSystems', secondPageParams, requestOption).resolves({
      'FileSystems': {
        'FileSystem': [
          {
            'Description': description,
            'FileSystemId': '109c042666',
            'RegionId': 'cn-hangzhou',
            'MeteredSize': 1611661312
          }
        ]
      },
      'TotalCount': 60,
      'PageSize': 50,
      'PageNumber': 2
    });

    const nasPopClient = { request: requestStub };

    const findSystemId = await nas.findNasFileSystem(nasPopClient, region, description);

    expect(findSystemId).to.eql('109c042666');

    assert.calledWith(requestStub.firstCall, 'DescribeFileSystems', firstPageParams, requestOption);
    assert.calledWith(requestStub.secondCall, 'DescribeFileSystems', secondPageParams, requestOption);
  });

  it('test find not found', async () => {
    const description = 'test';

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

    requestStub.withArgs('DescribeFileSystems', firstPageParams, requestOption).resolves({
      'FileSystems': {
        'FileSystem': [
          {
            'Description': 'not found'
          }
        ]
      },
      'TotalCount': 60,
      'PageSize': 50,
      'PageNumber': 1  
    });

    requestStub.withArgs('DescribeFileSystems', secondPageParams, requestOption).resolves({
      'FileSystems': {
        'FileSystem': [
          {
            'Description': 'not found'
          }
        ]
      },
      'TotalCount': 60,
      'PageSize': 50,
      'PageNumber': 2
    });

    const nasPopClient = { request: requestStub };

    const findSystemId = await nas.findNasFileSystem(nasPopClient, region, description);

    expect(findSystemId).to.eql(undefined);

    assert.calledWith(requestStub.firstCall, 'DescribeFileSystems', firstPageParams, requestOption);
    assert.calledWith(requestStub.secondCall, 'DescribeFileSystems', secondPageParams, requestOption);
  });

});

describe('test findMountTarget', async () => {

  afterEach(() => {
    sandbox.restore();
  });

  it('test', async () => {
    const fileSystemId = '123';
    const vpcId = 'vpc-bp1me4doa1zk2mwhksx4q';
    const vswId = 'vpc-bp1me4doa1zk2mwhksx4q';
    const mountTargetDomain = '0d2574b319-doo72.cn-hangzhou.nas.aliyuncs.com';

    const params = {
      'RegionId': region,
      'FileSystemId': fileSystemId
    };

    const requestStub = sandbox.stub();

    requestStub.withArgs('DescribeMountTargets', params, requestOption).resolves({
      'MountTargets': {
        'MountTarget': [
          {
            'VswId': vswId,
            'VpcId': vpcId,
            'MountTargetDomain': mountTargetDomain
          }
        ]
      }
    });

    const nasPopClient = { request: requestStub };

    const mountTarget = await nas.findMountTarget(nasPopClient, region, fileSystemId, vpcId, vswId);

    expect(mountTarget).to.eql(mountTargetDomain);

    assert.calledWith(requestStub, 'DescribeMountTargets', params, requestOption);
  });
});

describe('test createMountTarget', async () => {

  afterEach(() => {
    sandbox.restore();
  });

  it('test createMountTarget', async () => {
    const fileSystemId = '123';
    const vpcId = 'vpc-bp1me4doa1zk2mwhksx4q';
    const vswId = 'vpc-bp1me4doa1zk2mwhksx4q';
    const mountTargetDomain = '0d2574b319-doo72.cn-hangzhou.nas.aliyuncs.com';

    const params = {
      'RegionId': region,
      'NetworkType': 'Vpc',
      'FileSystemId': fileSystemId,
      'AccessGroupName': 'DEFAULT_VPC_GROUP_NAME',
      'VpcId': vpcId,
      'VSwitchId': vswId
    };

    const requestStub = sandbox.stub();

    requestStub.withArgs('CreateMountTarget', params, requestOption).resolves({
      'MountTargetDomain': '0d2574b319-doo72.cn-hangzhou.nas.aliyuncs.com'
    });

    const describeParms = {
      'RegionId': region,
      'FileSystemId': fileSystemId,
      'MountTargetDomain': mountTargetDomain
    };


    requestStub.withArgs('DescribeMountTargets', describeParms, requestOption)
      .onCall(0).resolves({
        'MountTargets': {
          'MountTarget': [
            {
              'Status': 'Pending'
            }
          ]
        }
      })
      .onCall(1).resolves({
        'MountTargets': {
          'MountTarget': [
            {
              'Status': 'Active'
            }
          ]
        }
      });

    const nasPopClient = { request: requestStub };

    const mountTarget = await nas.createMountTarget(nasPopClient, region, fileSystemId, vpcId, vswId);

    expect(mountTarget).to.eql(mountTargetDomain);

    assert.calledWith(requestStub.firstCall, 'CreateMountTarget', params, requestOption);
    assert.calledWith(requestStub.secondCall, 'DescribeMountTargets', describeParms, requestOption);
    assert.calledWith(requestStub.thirdCall, 'DescribeMountTargets', describeParms, requestOption);
  });

  it('test createMountTarget timeout', async () => {
    const fileSystemId = '123';
    const vpcId = 'vpc-bp1me4doa1zk2mwhksx4q';
    const vswId = 'vpc-bp1me4doa1zk2mwhksx4q';
    const mountTargetDomain = '0d2574b319-doo72.cn-hangzhou.nas.aliyuncs.com';

    const params = {
      'RegionId': region,
      'NetworkType': 'Vpc',
      'FileSystemId': fileSystemId,
      'AccessGroupName': 'DEFAULT_VPC_GROUP_NAME',
      'VpcId': vpcId,
      'VSwitchId': vswId
    };

    const requestStub = sandbox.stub();

    requestStub.withArgs('CreateMountTarget', params, requestOption).resolves({
      'MountTargetDomain': '0d2574b319-doo72.cn-hangzhou.nas.aliyuncs.com'
    });

    const describeParms = {
      'RegionId': region,
      'FileSystemId': fileSystemId,
      'MountTargetDomain': mountTargetDomain
    };

    requestStub.withArgs('DescribeMountTargets', describeParms, requestOption)
      .resolves({
        'MountTargets': {
          'MountTarget': [
            {
              'Status': 'Pending'
            }
          ]
        }
      });

    const nasPopClient = { request: requestStub };

    try {
      await nas.createMountTarget(nasPopClient, region, fileSystemId, vpcId, vswId);
    } catch (e) {
      expect(e.message).to.eql(`Timeout while waiting for MountPoint 0d2574b319-doo72.cn-hangzhou.nas.aliyuncs.com status to be 'Active'`);

      assert.calledWith(requestStub.firstCall, 'CreateMountTarget', params, requestOption);
      requestStub.withArgs('DescribeMountTargets', describeParms, requestOption);
      assert.callCount(requestStub, 1 + 15); // 1 CreateMountTarget, 15 DescribeVpcs
    }
  });
});