'use strict';

const sinon = require('sinon');
const proxyquire = require('proxyquire');
const mockdata = require('./mock-data');
const fs = require('fs-extra');
const path = require('path');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const tplPath = path.join('/', 'demo', 'template.yml');

const cp = sandbox.stub();
const validate = sandbox.stub();

const tpl = {
  detectTplPath: sandbox.stub().returns(tplPath), 
  getTpl: sandbox.stub().returns(mockdata.tpl)
};
const init = {
  deployNasService: sandbox.stub().resolves()
};

const syncStub = proxyquire('../../../lib/commands/nas/sync', {
  '../../validate/validate': validate,
  '../../nas/cp': cp,
  '../../tpl': tpl,
  '../../nas/init': init
});

describe('fun nas sync test', () => {
  let fsPathExists;
  beforeEach(() => {
    fsPathExists = sandbox.stub(fs, 'pathExists');
    fsPathExists.onCall(0).resolves(true);
    fsPathExists.onCall(1).resolves(true);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('sync test without service', async () => {
    
    const options = {
      service: undefined, 
      mntDirs: undefined
    };

    await syncStub(options);
    const localNasDir = path.join('/', 'demo', '.fun', 'nas', '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com', '/');
    assert.calledWith(cp, localNasDir, 'nas://fun-nas-test:/mnt/nas/', true);
  });

  it('sync test with service', async () => {
    const options = {
      service: 'fun-nas-test', 
      mntDirs: undefined
    };
    await syncStub(options);
    const localNasDir = path.join('/', 'demo', '.fun', 'nas', '359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com', '/');
    const baseDir = path.dirname(tplPath);
    assert.calledWith(cp, localNasDir, 'nas://fun-nas-test:/mnt/nas/', true);
    assert.calledWith(init.deployNasService, baseDir, mockdata.tpl, options.service);
  });

});