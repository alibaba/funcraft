'use strict';

const sinon = require('sinon');
const proxyquire = require('proxyquire');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;


const file = {
  isDir: sandbox.stub(), 
  isFile: sandbox.stub()
};
const upload = sandbox.stub();

const cpStub = proxyquire('../../lib/nas/cp', {
  './cp/file': file, 
  './cp/upload': upload
});
describe('nas cp test', () => {
    
  afterEach(() => {
    sandbox.reset();
  });

  it('cp test', async() => {
    const srcPath = '/demo/.fun/nas/auto-default';
    const dstPath = 'nas://fun-nas-test:/mnt/nas';
    file.isDir.returns(false);
    file.isFile.returns(true);

    await cpStub(srcPath, dstPath, false);
    assert.calledWith(upload, srcPath, '/mnt/nas', '/proxy/fun-nas-fun-nas-test/fun-nas-function/', false);
  });

  it('src path undefined test', async () => {
    const srcPath = undefined;
    const dstPath = 'nas://fun-nas-test:/mnt/nas';

    await cpStub(srcPath, dstPath, false);
    assert.notCalled(file.isDir);
    assert.notCalled(file.isFile);
    assert.notCalled(upload);
  });

});