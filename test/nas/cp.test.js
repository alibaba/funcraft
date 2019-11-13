'use strict';
const util = require('util');
const os = require('os');
const fs = require('fs');

const mkdirp = require('mkdirp-promise');
const rimraf = require('rimraf');
const mockdata = require('../commands/nas/mock-data');
const writeFile = util.promisify(fs.writeFile);
const expect = require('expect.js');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const { getBaseDir } = require('../../lib/tpl');
const { getNasHttpTriggerPath } = require('../../lib/nas/request');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const upload = {
  uploadFolder: sandbox.stub(), 
  uploadFile: sandbox.stub()
};
const request = {
  statsRequest: sandbox.stub()
};
const init = {
  deployNasService: sandbox.stub()
};
const cpStub = proxyquire('../../lib/nas/cp', {
  './cp/upload': upload, 
  './request': request, 
  './init': init
});

const tplPath = path.join(os.tmpdir(), 'nas', 'template.yml');
const baseDir = getBaseDir(tplPath);
const localNasTmpDir = path.join(baseDir, '.fun', 'tmp', 'nas', 'sync');
const tpl = mockdata.tpl; 
const isSync = false;
const resolvedDst = path.posix.join('/', 'mnt', 'nas');
const nasHttpTriggerPath = getNasHttpTriggerPath(mockdata.serviceName);
const dstPath = `nas://${mockdata.serviceName}${resolvedDst}`;
const recursive = true;
const noClobber = true;

describe('nas cp src path check error', () => {
  const localNotExistPath = path.join(os.tmpdir(), '.not-exist-path');
  const localNotEmptyPath = path.join(os.tmpdir(), '.not-empty-dir'); 
  const localEmptyPath = path.join(os.tmpdir(), '.empty-dir'); 
  const localFilePath = path.join(localNotEmptyPath, 'test.txt');


  beforeEach(async () => {
    await mkdirp(localEmptyPath);
    await mkdirp(localNotEmptyPath);
    await writeFile(`${localFilePath}`, 'this is a test');
  });

  afterEach(() => {
    rimraf.sync(localEmptyPath);
    rimraf.sync(localNotEmptyPath);
    sandbox.reset();
  });
  it('src path not exist', async() => {
    try {
      await cpStub(localNotExistPath, dstPath, recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync);
    } catch (error) {
      expect(error).to.eql(new Error(`${localNotExistPath} not exist`));
    }
    assert.notCalled(request.statsRequest);
    assert.notCalled(upload.uploadFile);
    assert.notCalled(upload.uploadFolder);
  });
  it('src path is empty dir', async() => {
    try {
      await cpStub(localEmptyPath, dstPath, recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync);
    } catch (error) {
      expect(error).to.eql(new Error(`${localEmptyPath} is empty, skip uploading`));
    }
    assert.notCalled(request.statsRequest);
    assert.notCalled(upload.uploadFile);
    assert.notCalled(upload.uploadFolder);
  });
  it('cp localDir without recursive option', async() => {
    try {
      await cpStub(localNotEmptyPath, dstPath, !recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync);
    } catch (error) {
      expect(error).to.eql(new Error('Can not copy folder without option -r/--recursive'));
    }
    assert.notCalled(request.statsRequest);
    assert.notCalled(upload.uploadFile);
    assert.notCalled(upload.uploadFolder);
  });
  
});

describe('nas cp local file to remote NAS', () => {

  const localNotEmptyPath = path.join(os.tmpdir(), '.cp-file-not-empty-dir'); 
  const localFilePath = path.join(localNotEmptyPath, 'test.txt');
  
  beforeEach(async () => {
    await mkdirp(localNotEmptyPath);
    await writeFile(`${localFilePath}`, 'this is a test');
  });

  afterEach(() => {
    rimraf.sync(localNotEmptyPath);
    sandbox.reset();
  });

  it('cp localFile nasExistedFile', async() => {
    
    request.statsRequest.returns({
      headers: 200,
      data: {
        path: resolvedDst,
        exists: true,
        parentDirExists: true,
        isDir: false,
        isFile: true,
        UserId: 10003,
        GroupId: 10003,
        mode: 123
      }
    });
    await cpStub(localFilePath, dstPath, !recursive, !noClobber, localNasTmpDir, tpl, baseDir, isSync);
    assert.calledWith(request.statsRequest, resolvedDst, nasHttpTriggerPath);
    assert.calledWith(upload.uploadFile, localFilePath, resolvedDst, nasHttpTriggerPath);
    assert.calledWith(init.deployNasService, baseDir, tpl, mockdata.serviceName);
    assert.notCalled(upload.uploadFolder);
  });
  it('cp localFile nasExistedFile -n', async() => {
    request.statsRequest.returns({
      headers: 200,
      data: {
        path: resolvedDst,
        exists: true,
        parentDirExists: true,
        isDir: false,
        isFile: true,
        UserId: 10003,
        GroupId: 10003,
        mode: 123
      }
    });
    try {
      await cpStub(localFilePath, dstPath, !recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync);
    } catch (error) {
      expect(error).to.eql(new Error(`${dstPath} already exists.`));
    }
    assert.calledWith(request.statsRequest, resolvedDst, nasHttpTriggerPath);
    assert.calledWith(init.deployNasService, baseDir, tpl, mockdata.serviceName);
    assert.notCalled(upload.uploadFolder);
    assert.notCalled(upload.uploadFile);
  });
  it('cp localFile nasExistedFile/', async() => {
    request.statsRequest.returns({
      headers: 200,
      data: {
        path: `${resolvedDst}/`,
        exists: true,
        parentDirExists: true,
        isDir: false,
        isFile: true,
        UserId: 10003,
        GroupId: 10003,
        mode: 123
      }
    });
    try {
      await cpStub(localFilePath, `${dstPath}/`, !recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync);
    } catch (error) {
      expect(error).to.eql(new Error(`${dstPath} : Not a directory`));
    }
    assert.calledWith(init.deployNasService, baseDir, tpl, mockdata.serviceName);
    assert.calledWith(request.statsRequest, `${resolvedDst}/`, nasHttpTriggerPath);
    assert.notCalled(upload.uploadFolder);
    assert.notCalled(upload.uploadFile);
  });
  it('cp localFile nasExistedDir, but nasExistedDir/path.basename(localFile) not exist', async() => {
    request.statsRequest.onCall(0).returns({
      headers: 200,
      data: {
        path: resolvedDst,
        exists: true,
        parentDirExists: true,
        isDir: true,
        isFile: false,
        UserId: 10003,
        GroupId: 10003,
        mode: 123
      }
    });
    
    const newResolvedDst = path.posix.join(resolvedDst, path.basename(localFilePath));
    request.statsRequest.onCall(1).returns({
      headers: 200,
      data: {
        path: newResolvedDst,
        exists: false,
        parentDirExists: true,
        isDir: false,
        isFile: false
      }
    });
    const actualDst = newResolvedDst;
    await cpStub(localFilePath, dstPath, !recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync);
    assert.calledWith(init.deployNasService, baseDir, tpl, mockdata.serviceName);
    assert.calledWith(request.statsRequest.firstCall, resolvedDst, nasHttpTriggerPath);
    assert.calledWith(request.statsRequest.secondCall, newResolvedDst, nasHttpTriggerPath);
    assert.notCalled(upload.uploadFolder);
    assert.calledWith(upload.uploadFile, localFilePath, actualDst, nasHttpTriggerPath);
  });
  it('cp localFile nasExistedDir, but nasExistedDir/path.basename(localFile) exists without -n option', async() => {
    request.statsRequest.onCall(0).returns({
      headers: 200,
      data: {
        path: resolvedDst,
        exists: true,
        parentDirExists: true,
        isDir: true,
        isFile: false,
        UserId: 10003,
        GroupId: 10003,
        mode: 123
      }
    });
    
    const newResolvedDst = path.posix.join(resolvedDst, path.basename(localFilePath));
    request.statsRequest.onCall(1).returns({
      headers: 200,
      data: {
        path: resolvedDst,
        exists: true,
        parentDirExists: true,
        isDir: false,
        isFile: true,
        UserId: 10003,
        GroupId: 10003,
        mode: 123
      }
    });
    const actualDst = newResolvedDst;
    await cpStub(localFilePath, dstPath, !recursive, !noClobber, localNasTmpDir, tpl, baseDir, isSync);
    assert.calledWith(init.deployNasService, baseDir, tpl, mockdata.serviceName);
    assert.calledWith(request.statsRequest.firstCall, resolvedDst, nasHttpTriggerPath);
    assert.calledWith(request.statsRequest.secondCall, newResolvedDst, nasHttpTriggerPath);
    assert.notCalled(upload.uploadFolder);
    assert.calledWith(upload.uploadFile, localFilePath, actualDst, nasHttpTriggerPath);
  });
  it('cp localFile nasExistedDir, but nasExistedDir/path.basename(localFile) exists with -n option', async() => {
    request.statsRequest.onCall(0).returns({
      headers: 200,
      data: {
        path: resolvedDst,
        exists: true,
        parentDirExists: true,
        isDir: true,
        isFile: false,
        UserId: 10003,
        GroupId: 10003,
        mode: 123
      }
    });
    const newDstPath = `${dstPath}/${path.basename(localFilePath)}`;
    const newResolvedDst = path.posix.join(resolvedDst, path.basename(localFilePath));
    request.statsRequest.onCall(1).returns({
      headers: 200,
      data: {
        path: resolvedDst,
        exists: true,
        parentDirExists: true,
        isDir: false,
        isFile: true,
        UserId: 10003,
        GroupId: 10003,
        mode: 123
      }
    });
    try {
      await cpStub(localFilePath, dstPath, !recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync);
    } catch (error) {
      expect(error).to.eql(new Error(`${newDstPath} already exists.`));
    }
    assert.calledWith(init.deployNasService, baseDir, tpl, mockdata.serviceName);
    assert.calledWith(request.statsRequest.firstCall, resolvedDst, nasHttpTriggerPath);
    assert.calledWith(request.statsRequest.secondCall, newResolvedDst, nasHttpTriggerPath);
    assert.notCalled(upload.uploadFolder);
    assert.notCalled(upload.uploadFile);
  });
  it('cp localFile nasNotExistedPath/', async() => {
    request.statsRequest.returns({
      headers: 200,
      data: {
        path: `${resolvedDst}/`,
        exists: false,
        parentDirExists: true,
        isDir: false,
        isFile: false
      }
    });
    try {
      await cpStub(localFilePath, `${dstPath}/`, !recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync);
    } catch (error) {
      expect(error).to.eql(new Error(`nas cp: cannot create regular file ${dstPath}: Not a directory`));
    }
    assert.calledWith(init.deployNasService, baseDir, tpl, mockdata.serviceName);
    assert.calledWith(request.statsRequest, `${resolvedDst}/`, nasHttpTriggerPath);
    assert.notCalled(upload.uploadFolder);
    assert.notCalled(upload.uploadFile);
  });
  it('cp localFile nasNotExistedPath, parent dir of nasNotExistedPath not exists', async() => {
    request.statsRequest.returns({
      headers: 200,
      data: {
        path: resolvedDst,
        exists: false,
        parentDirExists: false,
        isDir: false,
        isFile: false
      }
    });
    try {
      await cpStub(localFilePath, dstPath, !recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync);
    } catch (error) {
      expect(error).to.eql(new Error(`nas cp: cannot create regular file ${dstPath}: No such file or directory`));
    }
    assert.calledWith(init.deployNasService, baseDir, tpl, mockdata.serviceName);
    assert.calledWith(request.statsRequest, resolvedDst, nasHttpTriggerPath);
    assert.notCalled(upload.uploadFolder);
    assert.notCalled(upload.uploadFile);
  });
  it('cp localFile nasNotExistedPath, parent dir of nasNotExistedPath exists', async() => {
    request.statsRequest.returns({
      headers: 200,
      data: {
        path: resolvedDst,
        exists: false,
        parentDirExists: true,
        isDir: false,
        isFile: false
      }
    });
    await cpStub(localFilePath, dstPath, !recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync);
    assert.calledWith(request.statsRequest, resolvedDst, nasHttpTriggerPath);
    assert.calledWith(init.deployNasService, baseDir, tpl, mockdata.serviceName);
    assert.notCalled(upload.uploadFolder);
    assert.calledWith(upload.uploadFile, localFilePath, resolvedDst, nasHttpTriggerPath);
  });
  
});
describe('nas cp local folder to remote NAS', () => {
  const localNotEmptyPath = path.join(os.tmpdir(), '.cp-folder-not-empty-dir'); 
  const localFilePath = path.join(localNotEmptyPath, 'test.txt');

  beforeEach(async () => {
    await mkdirp(localNotEmptyPath);
    await writeFile(`${localFilePath}`, 'this is a test');
  });

  afterEach(() => {
    rimraf.sync(localNotEmptyPath);
    sandbox.reset();
  });
  after(() => {
    sandbox.restore();
  });
  it('cp localDir -r nasExistFile', async() => {
    request.statsRequest.returns({
      headers: 200,
      data: {
        path: resolvedDst,
        exists: true,
        parentDirExists: true,
        isDir: false,
        isFile: true,
        UserId: 10003,
        GroupId: 10003,
        mode: 123
      }
    });
    try {
      await cpStub(localNotEmptyPath, dstPath, recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync);
    } catch (error) {
      expect(error).to.eql(new Error(`nas cp: cannot overwrite non-directory ${dstPath} with directory ${localNotEmptyPath}`));
    }
    assert.calledWith(request.statsRequest, resolvedDst, nasHttpTriggerPath);
    assert.calledWith(init.deployNasService, baseDir, tpl, mockdata.serviceName);
    assert.notCalled(upload.uploadFolder);
    assert.notCalled(upload.uploadFile);
  });
  it('cp localDir -r nasExistFile/', async() => {
    request.statsRequest.returns({
      headers: 200,
      data: {
        path: `${resolvedDst}/`,
        exists: true,
        parentDirExists: true,
        isDir: false,
        isFile: true,
        UserId: 10003,
        GroupId: 10003,
        mode: 123
      }
    });
    try {
      await cpStub(localNotEmptyPath, `${dstPath}/`, recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync);
    } catch (error) {
      expect(error).to.eql(new Error(`nas cp: failed to access ${dstPath}/: Not a directory`));
    }
    assert.calledWith(request.statsRequest, `${resolvedDst}/`, nasHttpTriggerPath);
    assert.calledWith(init.deployNasService, baseDir, tpl, mockdata.serviceName);
    assert.notCalled(upload.uploadFolder);
    assert.notCalled(upload.uploadFile);
  });
  it('cp localDir -r nasNotExistPath, parent dir of nasNotExistedPath not exist', async() => {
    request.statsRequest.returns({
      headers: 200,
      data: {
        path: resolvedDst,
        exists: false,
        parentDirExists: false,
        isDir: false,
        isFile: false
      }
    });
    try {
      await cpStub(localNotEmptyPath, dstPath, recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync);
    } catch (error) {
      expect(error).to.eql(new Error(`nas cp: cannot create directory ${dstPath}: No such file or directory`));
    }
    
    assert.calledWith(request.statsRequest, resolvedDst, nasHttpTriggerPath);
    assert.calledWith(init.deployNasService, baseDir, tpl, mockdata.serviceName);
    assert.notCalled(upload.uploadFolder);
    assert.notCalled(upload.uploadFile);
  });
  it('cp localDir -r nasExistDir', async() => {
    request.statsRequest.returns({
      headers: 200,
      data: {
        path: resolvedDst,
        exists: true,
        parentDirExists: true,
        isDir: true,
        isFile: false,
        UserId: 10003,
        GroupId: 10003,
        mode: 123
      }
    });
    const actualDst = path.posix.join(resolvedDst, path.basename(localNotEmptyPath));
    await cpStub(localNotEmptyPath, dstPath, recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync);
    assert.calledWith(request.statsRequest, resolvedDst, nasHttpTriggerPath);
    assert.calledWith(init.deployNasService, baseDir, tpl, mockdata.serviceName);
    assert.calledWith(upload.uploadFolder, localNotEmptyPath, actualDst, nasHttpTriggerPath, localNasTmpDir, noClobber);
    assert.notCalled(upload.uploadFile);
  });
  it('cp localDir -r nasNotExistPath, parent dir of nasNotExistedPath exists', async() => {
    request.statsRequest.returns({
      headers: 200,
      data: {
        path: resolvedDst,
        exists: false,
        parentDirExists: true,
        isDir: false,
        isFile: false
      }
    });
    await cpStub(localNotEmptyPath, dstPath, recursive, noClobber, localNasTmpDir, tpl, baseDir, isSync);
    const actualDst = resolvedDst;
    assert.calledWith(request.statsRequest, resolvedDst, nasHttpTriggerPath);
    assert.calledWith(init.deployNasService, baseDir, tpl, mockdata.serviceName);
    assert.calledWith(upload.uploadFolder, localNotEmptyPath, actualDst, nasHttpTriggerPath, localNasTmpDir, noClobber);
    assert.notCalled(upload.uploadFile);
  });
});