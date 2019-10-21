'use strict';

const os = require('os');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const mockdata = require('./mock-data');
const fs = require('fs-extra');
const path = require('path');
const { detectNasBaseDir, getBaseDir } = require('../../../lib/tpl');
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
const tplPath = path.join(os.tmpdir(), 'nas', 'template.yml');
const baseDir = getBaseDir(tplPath);
const nasBaseDir = detectNasBaseDir(tplPath);

const localNasTmpDir = path.join(baseDir, '.fun', 'tmp', 'nas', 'sync');
const localNasDir = path.join(nasBaseDir, mockdata.serverPath, mockdata.mountSource);
const syncDstPath = `nas://${mockdata.serviceName}${mockdata.remoteNasDir}/`;
const isSync = true;
const recursive = true;
const noClobber = false;


describe('fun nas sync test with empty nas config', () => {
  
  beforeEach(() => {
    const fsPathExists = sandbox.stub(fs, 'pathExists');
    fsPathExists.onCall(0).resolves(true);
    fsPathExists.onCall(1).resolves(true);
    tpl.detectTplPath.returns(tplPath);
    tpl.getTpl.returns(mockdata.tplWithoutNasConfig);
  });

  afterEach(() => {
    sandbox.restore();
  });
  it('sync test without service option and mountDir option, with empty nas config', async() => {
    const options = {
      service: undefined, 
      mountDir: undefined
    };
    await syncStub(options);
    assert.notCalled(cp);
  });

  it('sync test with service option but without mountDir option, with empty nas config ', async () => {
    const options = {
      service: mockdata.serviceName, 
      mountDir: undefined
    };
    await syncStub(options);
    assert.notCalled(cp);
  });
  it('sync test with service and mountDir option, with empty nas config', async () => {
    const options = {
      service: mockdata.serviceName, 
      mountDir: [mockdata.remoteNasDir]
    };
    await syncStub(options);

    assert.notCalled(cp);
  });
});

describe('fun nas sync test with normal nas config', () => {
  
  beforeEach(() => {
    const fsPathExists = sandbox.stub(fs, 'pathExists');
    fsPathExists.onCall(0).resolves(true);
    fsPathExists.onCall(1).resolves(true);
    tpl.detectTplPath.returns(tplPath);
    tpl.getTpl.returns(mockdata.tpl);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('sync test without service option and mountDir option, with normal nas config', async () => {
    
    const options = {
      service: undefined, 
      mountDir: undefined
    };

    await syncStub(options);
    
    assert.calledWith(cp, localNasDir, syncDstPath, recursive, noClobber, localNasTmpDir, mockdata.tpl, baseDir, isSync);
  });

  it('sync test with service option but without mountDir option, with normal nas config ', async () => {
    
    const options = {
      service: mockdata.serviceName, 
      mountDir: undefined
    };
    await syncStub(options);
    
    assert.calledWith(cp, localNasDir, syncDstPath, recursive, noClobber, localNasTmpDir, mockdata.tpl, baseDir, isSync);
  });

  
  it('sync test with service and mountDir option, with normal nas config', async () => {
    const options = {
      service: mockdata.serviceName, 
      mountDir: [mockdata.remoteNasDir]
    };
    await syncStub(options);
    assert.calledWith(cp, localNasDir, syncDstPath, recursive, noClobber, localNasTmpDir, mockdata.tpl, baseDir, isSync);
  });

});