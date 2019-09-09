'use strict';
const os = require('os');

const path = require('path');
const mockdata = require('../commands/nas/mock-data');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const expect = require('expect.js');
const { getDefaultService, chunk, splitRangeBySize, checkWritePerm } = require('../../lib/nas/support');

describe('getDefaultService test', () => {
  const tplWithEmptyResource = {
    ROSTemplateFormatVersion: '2015-09-01',
    Transform: 'Aliyun::Serverless-2018-04-03',
    Resources: {}
  };
  it('tpl with only one service', async () => {
    let res = await getDefaultService(mockdata.tpl);
    expect(res).to.eql(mockdata.serviceName);
  });

  it('tpl with none service', async () => {
    
    try {
      getDefaultService(tplWithEmptyResource);
    } catch (error) {
      expect(error).to.eql(new Error('There should be one and only one service in your template.[yml|yaml].'));
    }
  });
});

describe('chunk test', () => {
  after(() => {
    sandbox.restore();
  });
  it('empty arr', () => {
    let res = chunk([], 1);
    expect(res).to.eql([]);
  });
  it('not empty arr', () => {
    let res = chunk([1, 2, 3], 2);
    expect(res).to.eql([[1, 2], [3]]);
  });

  it('0 step', () => {
    try {
      chunk([1, 2, 3], 0);
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
    const res = splitRangeBySize(10, 1, 2);
    expect(res).to.be.empty;
  });
  it('start < end', () => {
    
    const res = splitRangeBySize(1, 10, 4);
    expect(res).to.eql([{ start: 1, size: 4}, { start: 5, size: 4}, { start: 9, size: 1}]);
  });
  it('chunkSize === 0', () => {
    try {
      splitRangeBySize(1, 10, 0);
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
    const stats = { isExist: false };
    let nasId = {
      UserId: -1, 
      GroupId: -1
    };
    const res = checkWritePerm(stats, nasId, nasPath);

    expect(res).to.eql(`${nasPath} not exist`);
  });

  it('file has no write permission', () => {
    const stats = {
      isExist: true, 
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
    const res = checkWritePerm(stats, nasId, nasPath);
    expect(res).to.eql(`${nasPath} has no '-w-' or '-wx' permission, more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`);
  });

  it('folder has no write permission', () => {
    const stats = {
      isExist: true, 
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
    const res = checkWritePerm(stats, nasId, nasPath);
    expect(res).to.eql(`${nasPath} has no '-w-' or '-wx' permission, more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`);
  });

  it('userId and groupId mismatch', () => {
    const stats = {
      isExist: true, 
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
    const res = checkWritePerm(stats, nasId, nasPath);
    expect(res).to.eql(`UserId: ${nasId.UserId} and GroupId: ${nasId.GroupId} in your NasConfig are mismatched with UserId: ${stats.UserId} and GroupId: ${stats.GroupId} of ${nasPath}, \
which may cause permission problem, more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`);
  });
  it('userId match', () => {
    const stats = {
      isExist: true, 
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
    const res = checkWritePerm(stats, nasId, nasPath);
    expect(res).to.eql(undefined);
  });
  it('groupId match', () => {
    const stats = {
      isExist: true, 
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
    const res = checkWritePerm(stats, nasId, nasPath);
    expect(res).to.eql(undefined);
  });
  it('file userId and groupId have no write permission', () => {
    const stats = {
      isExist: true, 
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
    const res = checkWritePerm(stats, nasId, nasPath);
    expect(res).to.eql(`UserId: ${stats.UserId} and GroupId: ${stats.GroupId} have no '-w-' or '-wx' permission to ${nasPath}, which may cause permission problem, \
more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`);
  });
  it('floder userId and groupId have no write permission', () => {
    const stats = {
      isExist: true, 
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
    const res = checkWritePerm(stats, nasId, nasPath);
    expect(res).to.eql(`UserId: ${stats.UserId} and GroupId: ${stats.GroupId} have no '-w-' or '-wx' permission to ${nasPath}, which may cause permission problem, \
more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`);
  });
  
  it('isFile and isDir are both true', () => {
    const stats = {
      isExist: true, 
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
      checkWritePerm(stats, nasId, nasPath);
    } catch (error) {
      expect(error).to.eql(new Error(`isFile and isDir attributes of ${nasPath} are true simultaneously`));
    }
  });
});
