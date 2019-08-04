'use strict';

const sinon = require('sinon');
const proxyquire = require('proxyquire');
const mockdata = require('./mock-data');
const fs = require('fs-extra');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const cp = sandbox.stub();
const validate = sandbox.stub();

const tpl = {
  detectTplPath: sandbox.stub(), 
  getTpl: sandbox.stub()
};

const syncStub = proxyquire('../../../lib/commands/nas/sync', {
  '../../validate/validate': validate,
  '../../nas/cp': cp,
  '../../tpl': tpl
});

describe('fun nas sync test', () => {
  
  beforeEach(() => {
    tpl.detectTplPath.returns('/demo/template.yml');
    const fsPathExists = sandbox.stub(fs, 'pathExists');
    fsPathExists.onCall(0).resolves(true);
    fsPathExists.onCall(1).resolves(true);
    tpl.getTpl.returns(mockdata.tpl);
    
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('sync test', async () => {
    const options = {
      service: undefined, 
      mntDirs: undefined
    };

    await syncStub(options);
    assert.calledWith(cp, '/demo/.fun/nas/359414a1be-lwl67.cn-shanghai.nas.aliyuncs.com/', 'nas://fun-nas-test:/mnt/nas/', true);
  });

});