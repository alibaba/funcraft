'use strict';

const cp = require('../../../lib/commands/nas/cp');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const expect = require('expect.js');

const sandbox = sinon.createSandbox();

const uploader = {
  upload: sandbox.stub()
};
const fileSupporter = {
  isFileJudge: sandbox.stub(), 
  isDirJudge: sandbox.stub()
};
const pathSupporter = {
  resolveLocalPath: sandbox.stub()
  //parseNasPath: sinon.spy(), 
  //isNasProtocol: sinon.spy()
};
const httpConfig = {
  //getNasHttpTriggerPath: sandbox.stub()
  getNasHttpTriggerPath: sandbox.stub()
};
const nasCopy = {
  nasCp: sandbox.stub()
};

const cpStub = proxyquire('../../../lib/commands/nas/cp', {
  '../../nas/cp/upload': uploader, 
  '../../nas/cp/file-support': fileSupporter, 
  '../../nas/cp/path-support': pathSupporter,
  '../../nas/cp/http-config': httpConfig,
  '../../nas/cp/nas-cp': nasCopy
});

describe('cp local file to NAS test', () => {

  afterEach(() => {
    sandbox.reset();
  });

  it('it should return nothing if invalid dst nas protocol', async () => {
    
    const context = {
      src: 'test-file', 
      dst: 'nas://file',
      recursive: false
    };

    fileSupporter.isFileJudge.returns(Promise.resolve(true));
    fileSupporter.isDirJudge.returns(Promise.resolve(false));
    pathSupporter.resolveLocalPath.returns('/file/test-file');
    
    let res = await cpStub(context);
    expect(res).to.be();
    
    //sandbox.assert.callCount(pathSupporter.isNasProtocol, 2);
    sandbox.assert.calledOnce(fileSupporter.isDirJudge);
    sandbox.assert.calledOnce(fileSupporter.isFileJudge);
    sandbox.assert.calledOnce(pathSupporter.resolveLocalPath);
    //sandbox.assert.calledOnce(pathSupporter.parseNasPath);

    sandbox.assert.notCalled(uploader.upload);
    sandbox.assert.notCalled(httpConfig.getNasHttpTriggerPath);
  });

  it('it should return nothing if copy file wiht -R option', async () => {
    const context = {
      src: 'test-file', 
      dst: 'nas://service_name://mnt/nas',
      recursive: true
    };
    fileSupporter.isFileJudge.returns(Promise.resolve(true));
    fileSupporter.isDirJudge.returns(Promise.resolve(false));

    let res = await cpStub(context);
    expect(res).to.be();
    sandbox.assert.calledOnce(fileSupporter.isDirJudge);
    sandbox.assert.calledOnce(fileSupporter.isFileJudge);
    sandbox.assert.notCalled(pathSupporter.resolveLocalPath);
    sandbox.assert.notCalled(uploader.upload);
    sandbox.assert.notCalled(httpConfig.getNasHttpTriggerPath);
  });

  it('it should return nothing if copy folder wihtout -R option', async () => {
    const context = {
      src: 'test-folder', 
      dst: 'nas://service_name://mnt/nas',
      recursive: false
    };
    
    fileSupporter.isDirJudge.returns(Promise.resolve(true));
    
    let res = await cpStub(context);
    expect(res).to.be();
    sandbox.assert.calledOnce(fileSupporter.isDirJudge);
    sandbox.assert.notCalled(fileSupporter.isFileJudge);
    sandbox.assert.notCalled(pathSupporter.resolveLocalPath);
    sandbox.assert.notCalled(uploader.upload);
    sandbox.assert.notCalled(httpConfig.getNasHttpTriggerPath);
  });

  it('copy folder/folder wiht right option', async () => {
    const context_file = {
      src: 'test-file', 
      dst: 'nas://service_name://mnt/nas',
      recursive: false
    };
    fileSupporter.isFileJudge.returns(Promise.resolve(true));
    fileSupporter.isDirJudge.returns(Promise.resolve(false));
    pathSupporter.resolveLocalPath.returns('/file/test-file');
    uploader.upload.returns(Promise.resolve(true));
    
    await cpStub(context_file);
    sandbox.assert.calledOnce(fileSupporter.isDirJudge);
    sandbox.assert.calledOnce(fileSupporter.isFileJudge);
    sandbox.assert.calledOnce(pathSupporter.resolveLocalPath);
    sandbox.assert.calledOnce(uploader.upload);
    sandbox.assert.calledOnce(httpConfig.getNasHttpTriggerPath);

  });
});

describe('cp NAS to NAS', () => {
  it('nas path invalid', () => {

  });

  it('src service not equal to dst service', () => {

  });

  it('valid cp behavior', () => {

  });
});

describe('unsupport cp behavior', () => {
  it('cp NAS to locality', () => {

  });

  it('cp local to locality', () => {

  });

});
