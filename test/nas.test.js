'use strict';

const expect = require('expect.js');
let nas = require('../lib/nas');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const fs = require('fs-extra');

const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const region = 'cn-hangzhou';

var requestOption = {
  method: 'POST'
};

// const fsFunc = {
//   pathExists: sandbox.stub(), 
//   ensureDir: sandbox.stub()
// };

describe('test findNasFileSystem', async () => {

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

describe('test resolveMountPoint', () => {

  it('test resolveMountPoint', () => {
    const { mountSource, mountDir, serverPath, serverAddr } = nas.resolveMountPoint({
      ServerAddr: '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/',
      MountDir: '/mnt/test'
    });

    expect(mountSource).to.eql('/');
    expect(mountDir).to.eql('/mnt/test');
    expect(serverPath).to.eql('012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com');
    expect(serverAddr).to.eql('012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/');
  });

});

describe('test convertMountPointToLocal', () => {
  let fsPathExists;
  let fsEnsureDir;
  beforeEach (() => {
    fsPathExists = sandbox.stub(fs, 'pathExists');
    fsEnsureDir = sandbox.stub(fs, 'ensureDir');
  });

  afterEach(() => {
    sandbox.restore();
  });
  const MountPoint = {
    ServerAddr: '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/',
    MountDir: '/mnt/test'
  };
  
  const baseDir = '/service_test';
 
  it('nas dir not exist and local nas dir exists', async () => {
    fsPathExists.onCall(0).resolves(false);
    fsPathExists.onCall(1).resolves(true);
    const { localNasDir, remoteNasDir } = await nas.convertMountPointToLocal(baseDir, MountPoint);
    
    expect(localNasDir).to.eql('/service_test/.fun/nas/012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com/');
    expect(remoteNasDir).to.eql('/mnt/test');
    sandbox.assert.calledOnce(fsEnsureDir);
    sandbox.assert.callCount(fsPathExists, 2);
  });

  it('nas dir exist and local nas dir not exist', async () => {
    fsPathExists.onCall(0).resolves(true);
    fsPathExists.onCall(1).resolves(false);
    const { localNasDir, remoteNasDir } = await nas.convertMountPointToLocal(baseDir, MountPoint);
    
    expect(localNasDir).to.eql('/service_test/.fun/nas/012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com/');
    expect(remoteNasDir).to.eql('/mnt/test');
    sandbox.assert.calledOnce(fsEnsureDir);
    sandbox.assert.callCount(fsPathExists, 2);
  });

  it('nas dir exists and local nas dir exists', async () => {
    fsPathExists.onCall(0).resolves(true);
    fsPathExists.onCall(1).resolves(true);
    const { localNasDir, remoteNasDir } = await nas.convertMountPointToLocal(baseDir, MountPoint);
    
    expect(localNasDir).to.eql('/service_test/.fun/nas/012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com/');
    expect(remoteNasDir).to.eql('/mnt/test');
    sandbox.assert.notCalled(fsEnsureDir);
    sandbox.assert.callCount(fsPathExists, 2);
  });

  it('nas dir not exist and local nas dir not exist', async () => {
    fsPathExists.onCall(0).resolves(false);
    fsPathExists.onCall(1).resolves(false);
    const { localNasDir, remoteNasDir } = await nas.convertMountPointToLocal(baseDir, MountPoint);
    
    expect(localNasDir).to.eql('/service_test/.fun/nas/012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com/');
    expect(remoteNasDir).to.eql('/mnt/test');
    sandbox.assert.callCount(fsEnsureDir, 2);
    sandbox.assert.callCount(fsPathExists, 2);
  });

  it('empty mount point', async () => {
    const mountPointEmpty = {};
    let err;
    try {
      await nas.convertMountPointToLocal(baseDir, mountPointEmpty);
    } catch (error) {
      err = error;
    }
    expect(err).to.eql(new Error(`NasConfig's nas server address 'undefined' doesn't match expected format (allowed: '^[a-z0-9-.]*.nas.[a-z]+.com:/')`));
    sandbox.assert.notCalled(fsEnsureDir);
    sandbox.assert.notCalled(fsPathExists);
  });

  it('mount point without ServerAddr', async () => {
    const mountPointServerAddrEmpty = { MountDir: '/mnt/test' };
    let err;
    try {
      await nas.convertMountPointToLocal(baseDir, mountPointServerAddrEmpty);
    } catch (error) {
      err = error;
    }
    expect(err).to.eql(new Error(`NasConfig's nas server address 'undefined' doesn't match expected format (allowed: '^[a-z0-9-.]*.nas.[a-z]+.com:/')`));
    
    sandbox.assert.notCalled(fsPathExists);
    sandbox.assert.notCalled(fsEnsureDir);
  });

  it('mount point without MountDir', async () => {
    const mountPointMountDirEmpty = { ServerAddr: '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/' };
    fsPathExists.onCall(0).resolves(true);
    fsPathExists.onCall(1).resolves(true);
    const { localNasDir, remoteNasDir } = await nas.convertMountPointToLocal(baseDir, mountPointMountDirEmpty);
    expect(localNasDir).to.eql('/service_test/.fun/nas/012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com/');
    expect(remoteNasDir).to.eql(undefined);

    sandbox.assert.callCount(fsPathExists, 2);
    sandbox.assert.notCalled(fsEnsureDir);
  });
});

describe('test generateAutoNasConfig', () => {
  const serviceName = 'service_test';

  
});