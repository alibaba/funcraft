'use strict';

const sinon = require('sinon');
const proxyquire = require('proxyquire');
const mockdata = require('./mock-data');
const fs = require('fs-extra');
const path = require('path');
const { DEFAULT_NAS_PATH_SUFFIX } = require('../../../lib/tpl');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const tplPath = path.resolve('/', 'demo', 'template.yml');
const localNasTmpDir = path.join(path.dirname(tplPath), '.fun', 'tmp', 'nas', 'sync');
const cp = sandbox.stub();
const validate = sandbox.stub();

const tpl = {
  detectTplPath: sandbox.stub(), 
  getTpl: sandbox.stub()
};
const init = {
  deployNasService: sandbox.stub().resolves()
};
const support = {
  toBeUmountedDirs: sandbox.spy()
};

const syncStub = proxyquire('../../../lib/commands/nas/sync', {
  '../../validate/validate': validate,
  '../../nas/cp': cp,
  '../../tpl': tpl,
  '../../nas/init': init, 
  '../../nas/support': support
});

describe('fun nas sync test', () => {
  let fsPathExists;
  beforeEach(() => {
    fsPathExists = sandbox.stub(fs, 'pathExists');
    fsPathExists.onCall(0).resolves(true);
    fsPathExists.onCall(1).resolves(true);

    tpl.detectTplPath.returns(tplPath);
    tpl.getTpl.returns(mockdata.tpl);
  });

  afterEach(() => {
    sandbox.restore();
    sandbox.reset();
  });

  it('sync test without service', async () => {
    
    const options = {
      service: undefined, 
      mountDir: undefined
    };

    await syncStub(options);
    const localNasDir = path.join(path.resolve('/'), 'demo', DEFAULT_NAS_PATH_SUFFIX, '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com', '/');
    assert.notCalled(support.toBeUmountedDirs);
    assert.calledWith(cp, localNasDir, 'nas://fun-nas-test/mnt/nas/', true, localNasTmpDir, mockdata.nasId);
  });

  it('sync test with service', async () => {
    const options = {
      service: mockdata.serviceName, 
      mountDir: undefined
    };
    await syncStub(options);
    const localNasDir = path.join(path.resolve('/'), 'demo', DEFAULT_NAS_PATH_SUFFIX, '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com', '/');
    const baseDir = path.dirname(tplPath);
    assert.notCalled(support.toBeUmountedDirs);
    assert.calledWith(cp, localNasDir, `nas://${mockdata.serviceName}/mnt/nas/`, true, localNasTmpDir, mockdata.nasId);
    assert.calledWith(init.deployNasService, baseDir, mockdata.tpl, options.service);
  });

  it('sync test with service', async () => {
    const options = {
      service: mockdata.serviceName, 
      mountDir: ['/mnt/nas']
    };
    await syncStub(options);
    const localNasDir = path.join(path.resolve('/'), 'demo', DEFAULT_NAS_PATH_SUFFIX, '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com', '/');
    const baseDir = path.dirname(tplPath);
    
    assert.calledWith(support.toBeUmountedDirs, ['/mnt/nas'], ['/mnt/nas']);
    assert.calledWith(cp, localNasDir, `nas://${mockdata.serviceName}/mnt/nas/`, true, localNasTmpDir, mockdata.nasId);
    assert.calledWith(init.deployNasService, baseDir, mockdata.tpl, options.service);
  });

});