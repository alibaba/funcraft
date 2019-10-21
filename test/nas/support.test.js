'use strict';
const os = require('os');

const path = require('path');
const mockdata = require('../commands/nas/mock-data');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const assert = sandbox.assert;
const expect = require('expect.js');
const proxyquire = require('proxyquire');

const request = require('../../lib/nas/request');

const requestStub = {
  getVersion: sandbox.stub(), 
  getNasConfig: sandbox.stub()
};

const supportStub = proxyquire('../../lib/nas/support', {
  './request': requestStub
});
describe('getDefaultService test', () => {
  const tplWithEmptyResource = {
    ROSTemplateFormatVersion: '2015-09-01',
    Transform: 'Aliyun::Serverless-2018-04-03',
    Resources: {}
  };
  it('tpl with only one service', async () => {
    let res = await supportStub.getDefaultService(mockdata.tpl);
    expect(res).to.eql(mockdata.serviceName);
  });

  it('tpl with none service', async () => {
    
    try {
      supportStub.getDefaultService(tplWithEmptyResource);
    } catch (error) {
      expect(error).to.eql(new Error('There should be one and only one service in your template.[yml|yaml] when ignoring service in nas path.'));
    }
  });
});

describe('chunk test', () => {
  after(() => {
    sandbox.restore();
  });
  it('empty arr', () => {
    let res = supportStub.chunk([], 1);
    expect(res).to.eql([]);
  });
  it('not empty arr', () => {
    let res = supportStub.chunk([1, 2, 3], 2);
    expect(res).to.eql([[1, 2], [3]]);
  });

  it('0 step', () => {
    try {
      supportStub.chunk([1, 2, 3], 0);
    } catch (error) {
      expect(error).to.eql(new Error('chunk step should not be 0'));
    }
  });
});

describe('splitRangeBySize test', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('start > end', () => {
    const res = supportStub.splitRangeBySize(10, 1, 2);
    expect(res).to.be.empty;
  });
  it('start < end', () => {
    
    const res = supportStub.splitRangeBySize(1, 10, 4);
    expect(res).to.eql([{ start: 1, size: 4}, { start: 5, size: 4}, { start: 9, size: 1}]);
  });
  it('chunkSize === 0', () => {
    try {
      supportStub.splitRangeBySize(1, 10, 0);
    } catch (error) {
      expect(error).to.eql(new Error('chunkSize of function splitRangeBySize should not be 0'));
    }
  });
});

describe('checkWritePerm test', () => {
  const nasPath = path.join(os.tmpdir(), '.nas');
  const mode_555 = 33133;
  const mode_557 = 33135;
  const mode_575 = 33149;
  const mode_666 = 33206;
  const mode_755 = 33261;
  
  afterEach(() => {
    sandbox.restore();
  });

  it('path not exist', () => {
    const stats = { exists: false };
    let nasId = {
      UserId: -1, 
      GroupId: -1
    };
    const res = supportStub.checkWritePerm(stats, nasId, nasPath);

    expect(res).to.be.undefined;
  });

  it('file has no write permission', () => {
    const stats = {
      exists: true, 
      isDir: false,
      isFile: true, 
      UserId: 10, 
      GroupId: 10, 
      mode: mode_555
    };
    const nasId = {
      UserId: 10, 
      GroupId: 10
    };
    const res = supportStub.checkWritePerm(stats, nasId, nasPath);
    expect(res).to.eql(`${nasPath} has no '-w-' or '-wx' permission, more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`);
  });

  it('folder has no write permission', () => {
    const stats = {
      exists: true, 
      isDir: true,
      isFile: false, 
      UserId: 10, 
      GroupId: 10, 
      mode: mode_666
    };
    const nasId = {
      UserId: 10, 
      GroupId: 10
    };
    const res = supportStub.checkWritePerm(stats, nasId, nasPath);
    expect(res).to.eql(`${nasPath} has no '-w-' or '-wx' permission, more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`);
  });

  it('userId and groupId mismatch', () => {
    const stats = {
      exists: true, 
      isDir: true,
      isFile: false, 
      UserId: 10, 
      GroupId: 10, 
      mode: mode_755
    };
    const nasId = {
      UserId: 1, 
      GroupId: 1
    };
    const res = supportStub.checkWritePerm(stats, nasId, nasPath);
    expect(res).to.eql(`UserId: ${nasId.UserId} and GroupId: ${nasId.GroupId} in your NasConfig are mismatched with UserId: ${stats.UserId} and GroupId: ${stats.GroupId} of ${nasPath}, \
which may cause permission problem, more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`);
  });
  it('userId match', () => {
    const stats = {
      exists: true, 
      isDir: true,
      isFile: false, 
      UserId: 10, 
      GroupId: 10, 
      mode: mode_755
    };
    const nasId = {
      UserId: 10, 
      GroupId: 1
    };
    const res = supportStub.checkWritePerm(stats, nasId, nasPath);
    expect(res).to.eql(undefined);
  });
  it('groupId match', () => {
    const stats = {
      exists: true, 
      isDir: true,
      isFile: false, 
      UserId: 10, 
      GroupId: 10, 
      mode: mode_575
    };
    const nasId = {
      UserId: 1, 
      GroupId: 10
    };
    const res = supportStub.checkWritePerm(stats, nasId, nasPath);
    expect(res).to.eql(undefined);
  });
  it('file userId and groupId have no write permission', () => {
    const stats = {
      exists: true, 
      isDir: false,
      isFile: true, 
      UserId: 10, 
      GroupId: 10, 
      mode: mode_557
    };
    const nasId = {
      UserId: 10, 
      GroupId: 10
    };
    const res = supportStub.checkWritePerm(stats, nasId, nasPath);
    expect(res).to.eql(`UserId: ${stats.UserId} and GroupId: ${stats.GroupId} have no '-w-' or '-wx' permission to ${nasPath}, which may cause permission problem, \
more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`);
  });
  it('floder userId and groupId have no write permission', () => {
    const stats = {
      exists: true, 
      isDir: true,
      isFile: false, 
      UserId: 10, 
      GroupId: 10, 
      mode: mode_557
    };
    const nasId = {
      UserId: 10, 
      GroupId: 10
    };
    const res = supportStub.checkWritePerm(stats, nasId, nasPath);
    expect(res).to.eql(`UserId: ${stats.UserId} and GroupId: ${stats.GroupId} have no '-w-' or '-wx' permission to ${nasPath}, which may cause permission problem, \
more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`);
  });
  
  it('isFile and isDir are both true', () => {
    const stats = {
      exists: true, 
      isDir: true,
      isFile: true, 
      UserId: 10, 
      GroupId: 10, 
      mode: mode_557
    };
    const nasId = {
      UserId: 10, 
      GroupId: 10
    };
    try {
      supportStub.checkWritePerm(stats, nasId, nasPath);
    } catch (error) {
      expect(error).to.eql(new Error(`isFile and isDir attributes of ${nasPath} are true simultaneously`));
    }
  });
});

describe('isSameVersion test', () => {
  const nasHttpTriggerPath = request.getNasHttpTriggerPath(mockdata.serviceName);
  beforeEach(() => {
    
    requestStub.getVersion.returns({
      header: 200, 
      data: {
        curVersionId: '123'
      }
    });
  });
  afterEach(() => {
    sandbox.restore();
  });
  it('version not matched', async () => {
    const res = await supportStub.isSameVersion(mockdata.serviceName, '321');
    expect(res).to.eql(false);
    
    assert.calledWith(requestStub.getVersion, nasHttpTriggerPath);
  });
  it('version matched', async () => {
    const res = await supportStub.isSameVersion(mockdata.serviceName, '123');
    expect(res).to.eql(true);
    assert.calledWith(requestStub.getVersion, nasHttpTriggerPath);
  });
});

describe('isSameNasConfig test', () => {
  beforeEach(() => {
    requestStub.getNasConfig.returns({
      userId: 1000,
      groupId: 1000,
      mountPoints: [{
        serverAddr: '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com:/',
        mountDir: '/mnt/nas'
      }]
    });
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('config not matched', async() => {
    const nasConig = {
      UserId: 100,
      GroupId: 100, 
      MountPoints: [{
        ServerAddr: '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com:/',
        MountDir: '/mnt/nas'
      }]
    };
    const res = await supportStub.isSameNasConfig(mockdata.serviceName, nasConig);
    expect(res).to.eql(false);
    assert.calledWith(requestStub.getNasConfig, mockdata.serviceName);
  });

  it('auto nas config not matched', async() => {
    const res = await supportStub.isSameNasConfig(mockdata.serviceName, 'Auto');
    expect(res).to.eql(false);
    assert.calledWith(requestStub.getNasConfig, mockdata.serviceName);
  });
  it('auto nas config matched', async() => {
    requestStub.getNasConfig.returns({
      userId: 10003,
      groupId: 10003,
      mountPoints: [{
        serverAddr: '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com:/',
        mountDir: '/mnt/auto'
      }]
    });
    const res = await supportStub.isSameNasConfig(mockdata.serviceName, 'Auto');
    expect(res).to.eql(true);
    assert.calledWith(requestStub.getNasConfig, mockdata.serviceName);
  }); 
  it('config matched', async() => {
    const nasConig = {
      UserId: 1000,
      GroupId: 1000, 
      MountPoints: [{
        ServerAddr: '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com:/',
        MountDir: '/mnt/nas'
      }]
    };
    const res = await supportStub.isSameNasConfig(mockdata.serviceName, nasConig);
    expect(res).to.eql(true);
    assert.calledWith(requestStub.getNasConfig, mockdata.serviceName);
  });
});
describe('getNasId test', () => {
  it('normal nas config test', () => {
    const res = supportStub.getNasId(mockdata.tpl, mockdata.serviceName);
    expect(res).to.eql(mockdata.nasId);
  });
  it('empty nas config test', () => {
    const res = supportStub.getNasId(mockdata.tplWithoutNasConfig, mockdata.serviceName);
    expect(res).to.eql({});
  });
});
describe('getNasPathAndServiceFromNasUri test', () => {
  const nasUri = 'nas:///mnt/auto';
  it('normal nas config test', () => {
    const res = supportStub.getNasPathAndServiceFromNasUri(nasUri, mockdata.tpl);
    expect(res).to.eql({
      nasPath: '/mnt/auto', 
      serviceName: mockdata.serviceName
    });
  });
  it('empty nas config test', () => {
    const res = supportStub.getNasPathAndServiceFromNasUri(nasUri, mockdata.tplWithoutNasConfig);
    expect(res).to.eql({
      nasPath: '/mnt/auto', 
      serviceName: mockdata.serviceName
    });
  });
});

