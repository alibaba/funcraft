'use strict';

const util = require('util');
const os = require('os');
const fs = require('fs');

const mkdirp = require('mkdirp-promise');
const rimraf = require('rimraf');
const writeFile = util.promisify(fs.writeFile);

const path = require('path');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;


describe('upload test', () => {
  const srcPath = path.join(os.tmpdir(), 'local-nas-dir', '/');
  const dstPath = path.posix.join('/', 'mnt', 'nas');
  const nasHttpTriggerPath = '/proxy/';
  const zipDst = path.join(path.dirname(srcPath), `.${path.basename(srcPath)}.zip`);
  const srcPathFile = path.join(srcPath, 'test-file');
  let request;
  let file;
  let uploadStub;

  request = {
    statsRequest: sandbox.stub(), 
    checkHasUpload: sandbox.stub(), 
    sendMergeRequest: sandbox.stub(), 
    uploadSplitFile: sandbox.stub(), 
    uploadFile: sandbox.stub(),
    sendUnzipRequest: sandbox.stub(),
    sendCleanRequest: sandbox.stub()
  };
  
  file = {
    zipWithArchiver: sandbox.stub()
  };
  
  uploadStub = proxyquire('../../../lib/nas/cp/upload', {
    '../request': request, 
    './file': file
  });

  beforeEach(async () => {
    await mkdirp(srcPath);
    await writeFile(srcPathFile, 'this is a test');

    request.sendMergeRequest.returns({
      headers: 200, 
      data: {
        desc: 'unzip success',
        nasZipFile: 'zipFile'
      }
    });

    request.uploadFile.returns({
      headers: 200, 
      data: {
        stat: 1,
        desc: 'Folder saved'
      }
    });

    request.checkHasUpload.returns({
      headers: 200, 
      data: {
        nasTmpDir: '/mnt/nas/.tmp',
        dstDir: '/mnt/nas',
        uploadedSplitFiles: '{}'
      }
    });
    request.statsRequest.returns({
      headers: 200, 
      data: {
        path: '/mnt/nas',
        isExist: true,
        isDir: true,
        isFile: false
      }
    });

    request.sendUnzipRequest.returns({
      stdout: 'test',
      stderr: ''
    });
    request.sendCleanRequest.returns({
      desc: 'clean done'
    });
    file.zipWithArchiver.returns(zipDst);
    request.uploadSplitFile.returns();
  });

  afterEach(() => {
    sandbox.reset();
    rimraf.sync(srcPath);
  });

  it('upload file more than 5M', async() => { 
    await writeFile(zipDst, Buffer.alloc(10 * 1024 * 1024));

    await uploadStub(srcPath, dstPath, nasHttpTriggerPath);

    assert.calledWith(request.statsRequest, dstPath, nasHttpTriggerPath);
    
    assert.calledOnce(request.checkHasUpload);
    
    assert.notCalled(request.uploadFile);
    assert.called(request.uploadSplitFile);
    assert.calledOnce(request.sendMergeRequest);
    assert.calledWith(file.zipWithArchiver, srcPath);
    assert.calledOnce(request.sendUnzipRequest);
    assert.calledOnce(request.sendCleanRequest);

  });

  it('upload file less than 5M', async () => {
    
    await writeFile(zipDst, new Buffer(4 * 1024 * 1024));
    

    await uploadStub(srcPath, dstPath, nasHttpTriggerPath);

    assert.calledWith(request.statsRequest, dstPath, nasHttpTriggerPath);
    assert.calledOnce(request.checkHasUpload);
    assert.calledOnce(request.uploadFile);
    assert.notCalled(request.uploadSplitFile);
    assert.notCalled(request.sendMergeRequest);
    assert.calledWith(file.zipWithArchiver, srcPath);
    assert.notCalled(request.sendUnzipRequest);
    assert.notCalled(request.sendCleanRequest);
  });
});