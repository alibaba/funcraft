'use strict';

const expect = require('expect.js');
let nas = require('../lib/nas');
const fs = require('fs-extra');
const path = require('path');
const sinon = require('sinon');
const yaml = require('js-yaml');
const mockdata = require('./commands/nas/mock-data');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;


const region = 'cn-hangzhou';

var requestOption = {
  method: 'POST'
};

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

describe('test convertMountPointToNasMapping', () => {
  let fsPathExists;
  let fsEnsureDir;
  beforeEach (() => {
    fsEnsureDir = sandbox.stub(fs, 'ensureDir');
    fsPathExists = sandbox.stub(fs, 'pathExists');
  });

  afterEach(() => {
    sandbox.restore();
  });
  const MountPoint = {
    ServerAddr: '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com:/',
    MountDir: '/mnt/test'
  };

  const baseDir = '/service_test';
  const nasDir = path.join(baseDir, '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com');
  
  it('nas dir not exist and local nas dir exists', async () => {
    
    fsPathExists.onCall(0).resolves(false);
    fsPathExists.onCall(1).resolves(true);
    const { localNasDir, remoteNasDir } = await nas.convertMountPointToNasMapping(baseDir, MountPoint);

    
    expect(localNasDir).to.eql(path.join(nasDir, '/'));
    expect(remoteNasDir).to.eql('/mnt/test');
    assert.calledWith(fsEnsureDir, nasDir);
    assert.calledWith(fsPathExists.firstCall, nasDir);
    assert.calledWith(fsPathExists.secondCall, localNasDir);

    
  });

  it('nas dir exist and local nas dir not exist', async () => {
    
    fsPathExists.onCall(0).resolves(true);
    fsPathExists.onCall(1).resolves(false);
    const { localNasDir, remoteNasDir } = await nas.convertMountPointToNasMapping(baseDir, MountPoint);
    let nasDir = path.join(baseDir, '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com');
    expect(localNasDir).to.eql(path.join(nasDir, '/'));
    expect(remoteNasDir).to.eql('/mnt/test');
    assert.calledWith(fsEnsureDir, localNasDir);
    assert.calledWith(fsPathExists.firstCall, nasDir);
    assert.calledWith(fsPathExists.secondCall, localNasDir);
    
  });

  it('nas dir exists and local nas dir exists', async () => {
    
    fsPathExists.onCall(0).resolves(true);
    fsPathExists.onCall(1).resolves(true);
    const { localNasDir, remoteNasDir } = await nas.convertMountPointToNasMapping(baseDir, MountPoint);
    let nasDir = path.join(baseDir, '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com');
    expect(localNasDir).to.eql(path.join(nasDir, '/'));
    expect(remoteNasDir).to.eql('/mnt/test');
    sandbox.assert.notCalled(fsEnsureDir);
    assert.calledWith(fsPathExists.firstCall, nasDir);
    assert.calledWith(fsPathExists.secondCall, localNasDir);
    
  });

  it('nas dir not exist and local nas dir not exist', async () => {
    
    fsPathExists.onCall(0).resolves(false);
    fsPathExists.onCall(1).resolves(false);
    const { localNasDir, remoteNasDir } = await nas.convertMountPointToNasMapping(baseDir, MountPoint);
    let nasDir = path.join(baseDir, '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com');
    expect(localNasDir).to.eql(path.join(nasDir, '/'));
    expect(remoteNasDir).to.eql('/mnt/test');
    assert.calledWith(fsEnsureDir.firstCall, nasDir);
    assert.calledWith(fsEnsureDir.secondCall, localNasDir);
    assert.calledWith(fsPathExists.firstCall, nasDir);
    assert.calledWith(fsPathExists.secondCall, localNasDir);
    
  });

  it('empty mount point', async () => {
    
    const mountPointEmpty = {};
    let err;
    try {
      await nas.convertMountPointToNasMapping(baseDir, mountPointEmpty);
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
      await nas.convertMountPointToNasMapping(baseDir, mountPointServerAddrEmpty);
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
    const { localNasDir, remoteNasDir } = await nas.convertMountPointToNasMapping(baseDir, mountPointMountDirEmpty);
    let nasDir = path.join(baseDir, '012194b28f-ujc20.cn-hangzhou.nas.aliyuncs.com');
    expect(localNasDir).to.eql(path.join(nasDir, '/'));
    expect(remoteNasDir).to.eql(undefined);

    assert.calledWith(fsPathExists.firstCall, nasDir);
    assert.calledWith(fsPathExists.secondCall, localNasDir);
    sandbox.assert.notCalled(fsEnsureDir);
    
  });
});

describe('test convertNasConfigToNasMappings', () => {
  const baseDir = '/service_test';
  const serviceName = 'demo_service';
  let fsPathExists;
  let fsEnsureDir;
  beforeEach(() => {
    fsEnsureDir = sandbox.stub(fs, 'ensureDir');
    fsPathExists = sandbox.stub(fs, 'pathExists');
  });

  afterEach(() => {
    sandbox.restore();
  });
  
  it('empty nas config', async () => {
    const nasConfig = {};
    const res = await nas.convertNasConfigToNasMappings(baseDir, nasConfig, serviceName);
    expect(res).to.eql([]);
    
  });

  it('nas config auto', async () => {
    
    const nasConfig = 'Auto';
    const nasDir = path.join(baseDir, 'auto-default');

    fsPathExists.resolves(false);
    const res = await nas.convertNasConfigToNasMappings(baseDir, nasConfig, serviceName);

    expect(res[0].localNasDir).to.eql(path.join(nasDir, serviceName));
    expect(res[0].remoteNasDir).to.eql('/mnt/auto');

    assert.calledWith(fsPathExists, res[0].localNasDir);
    assert.calledWith(fsEnsureDir, res[0].localNasDir);
    
  });
  
  it('nas config not auto', async () => {
    
    const nasConfig = {
      UserId: 10003,
      GroupId: 10003,
      MountPoints: [{
        ServerAddr: '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com:/',
        MountDir: '/mnt/nas'
      }] 
    };

    const nasDir = path.join(baseDir, '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com');
    const localNasDir = path.join(nasDir, '/');
    const remoteNasDir = '/mnt/nas';

    fsPathExists.onCall(0).resolves(true);
    fsPathExists.onCall(1).resolves(true);
    
    const res = await nas.convertNasConfigToNasMappings(baseDir, nasConfig, serviceName);
    
    expect(res[0].localNasDir).to.eql(localNasDir);
    expect(res[0].remoteNasDir).to.eql(remoteNasDir);
    
  });
});

describe('test convertTplToServiceNasMappings', () => {
  
  const baseDir = '/service_test';
  let fsPathExists;
  let fsEnsureDir;
  beforeEach(() => {
    fsEnsureDir = sandbox.stub(fs, 'ensureDir');
    fsPathExists = sandbox.stub(fs, 'pathExists');
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('empty tpl resource', async () => {
    
    const tpl = {
      ROSTemplateFormatVersion: '2015-09-01',
      Transform: 'Aliyun::Serverless-2018-04-03',
      Resources: {}
    };

    const serviceNasMappings = await nas.convertTplToServiceNasMappings(baseDir, tpl);
    expect(serviceNasMappings).to.eql({});
    assert.notCalled(fsPathExists);
    assert.notCalled(fsEnsureDir);
    
  });

  it('normal tpl', async () => {
    const nasConfig = {
      UserId: 10003,
      GroupId: 10003,
      MountPoints: [{
        ServerAddr: '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com:/',
        MountDir: '/mnt/nas'
      }] 
    };
    const tpl = {
      ROSTemplateFormatVersion: '2015-09-01',
      Transform: 'Aliyun::Serverless-2018-04-03',
      Resources: {
        'fun-nas-test': {
          Type: 'Aliyun::Serverless::Service',
          Properties: {
            NasConfig: nasConfig
          }
        }
      }
    };
    const serviceName = 'fun-nas-test';
    console.log(yaml.safeDump(tpl));
    const nasDir = path.join(baseDir, '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com');
    const localNasDir = path.join(nasDir, '/');
    const remoteNasDir = '/mnt/nas';

    fsPathExists.onCall(0).resolves(true);
    fsPathExists.onCall(1).resolves(true);
    console.log();
    const res = await nas.convertTplToServiceNasMappings(baseDir, tpl);

    expect(res[serviceName]).to.eql([{localNasDir, remoteNasDir}]);
  });

});

describe('test convertTplToServiceNasIdMappings', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('normal tpl resource', () => {
    const res = nas.convertTplToServiceNasIdMappings(mockdata.tpl);
    expect(res).to.eql({
      [mockdata.serviceName]: mockdata.nasId
    });
  });

  it('tpl without NasConfig', () => {
    const res = nas.convertTplToServiceNasIdMappings(mockdata.tplWithoutNasConfig);
    expect(res).to.eql({[mockdata.serviceName]: {}});
  });

  it('empty tpl resource', () => {
    const tpl = {
      ROSTemplateFormatVersion: '2015-09-01',
      Transform: 'Aliyun::Serverless-2018-04-03',
      Resources: {}
    };
    const res = nas.convertTplToServiceNasIdMappings(tpl);
    expect(res).to.eql({});
  });
});