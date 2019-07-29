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
  resolveLocalPath: sandbox.stub(), 
  parseNasPath: sandbox.stub(), 
  isNasProtocol: sandbox.stub()
};


describe('cp local file to NAS test', () => {

  afterEach(() => {
    sandbox.reset();
  });
  
  const cpStub = proxyquire('../../../lib/commands/nas/cp', {
    '../../nas/cp/upload': uploader, 
    '../../nas/cp/file-support': fileSupporter, 
    '../../nas/cp/path-support': pathSupporter
  });

  
  it('invalid nas protocol', async () => {
    
    const context = {
      src: 'test-file', 
      dst: 'nas://file',
      recursive: false
    };
    fileSupporter.isFileJudge.returns(Promise.resolve(true));
    fileSupporter.isDirJudge.returns(Promise.resolve(false));
    pathSupporter.resolveLocalPath.returns('/file/test-file');
    
    await cpStub(context);

    sandbox.assert.calledOnce(fileSupporter.isFileJudge);
    sandbox.assert.calledOnce(fileSupporter.isDirJudge);
    sandbox.assert.callCount(pathSupporter.isNasProtocol, 4);
    sandbox.assert.notCalled(uploader.upload);
  });

  it('cp file wiht -R option test', () => {

  });

  it('cp folder wihtout -R option test', () => {

  });

  it('cp folder/folder wiht right option test', () => {

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
