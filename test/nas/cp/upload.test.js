'use strict';

const util = require('util');
const os = require('os');
const fs = require('fs');

const mkdirp = require('mkdirp-promise');
const rimraf = require('rimraf');
const mockdata = require('../../commands/nas/mock-data');
const writeFile = util.promisify(fs.writeFile);
const { getFileHash } = require('../../../lib/nas/cp/file');
const path = require('path');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;


describe('upload test', () => {
  const srcPath = path.join(os.tmpdir(), 'local-nas-dir', '/');
  const dstPath = path.posix.join('/', 'mnt', 'nas');
  const nasHttpTriggerPath = '/proxy/';
  const zipFilePath = path.join(path.dirname(srcPath), `.fun-nas-generated-${path.basename(srcPath)}.zip`);
  const fileName = path.basename(zipFilePath);
  const remoteNasTmpDir = path.posix.join(dstPath, '.fun_nas_tmp');
  const nasZipFile = path.posix.join(remoteNasTmpDir, fileName);
  const zipFileSize = 10 * 1024 * 1024;
  const localNasTmpDir = 'nastmp';
  const srcPathFile = path.join(srcPath, 'test-file');
  let request;
  let file;
  let uploadStub;
  let zipHash;
  request = {
    statsRequest: sandbox.stub(),
    sendUnzipRequest: sandbox.stub(),
    sendCleanRequest: sandbox.stub(),
    createSizedNasFile: sandbox.stub(),
    uploadChunkFile: sandbox.stub(),
    checkFileHash: sandbox.stub(), 
    checkRemoteNasTmpDir: sandbox.stub()
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

    request.createSizedNasFile.returns({
      headers: 200,
      data: {
        stdout: 'stdout',
        stderr: ''
      }
    });
    request.uploadChunkFile.returns({
      headers: 200,
      data: {
        desc: 'chunk file write done'
      }
    });
    request.checkFileHash.returns({
      headers: 200, 
      data: {
        stat: 1, 
        desc: 'File saved'
      }
    });

    request.statsRequest.returns({
      headers: 200, 
      data: {
        path: '/mnt/nas',
        isExist: true,
        isDir: true,
        isFile: false, 
        UserId: 100, 
        GroupId: 100, 
        mode: 123
      }
    });

    request.sendUnzipRequest.returns({
      stdout: 'test',
      stderr: ''
    });
    request.sendCleanRequest.returns({
      desc: 'clean done'
    });
    request.checkRemoteNasTmpDir.returns({
      desc: 'check tmpDir done!'
    });
    file.zipWithArchiver.returns(zipFilePath);
  });

  afterEach(() => {
    sandbox.reset();
    rimraf.sync(srcPath);
  });

  it('upload file', async() => { 
    await writeFile(zipFilePath, Buffer.alloc(zipFileSize));
    zipHash = await getFileHash(zipFilePath);
    await uploadStub(srcPath, dstPath, nasHttpTriggerPath, true, localNasTmpDir, mockdata.nasId);

    assert.calledWith(request.statsRequest, dstPath, nasHttpTriggerPath);
    
    assert.calledWith(file.zipWithArchiver, srcPath, localNasTmpDir);
    assert.calledWith(request.createSizedNasFile, nasHttpTriggerPath, nasZipFile, zipFileSize);
    assert.calledTwice(request.uploadChunkFile);
    assert.calledWith(request.checkFileHash, nasHttpTriggerPath, nasZipFile, zipHash);

    assert.calledWith(request.sendUnzipRequest, nasHttpTriggerPath, dstPath, nasZipFile, ['test-file']);
    assert.calledWith(request.sendCleanRequest, nasHttpTriggerPath, nasZipFile);
    assert.calledWith(request.checkRemoteNasTmpDir, nasHttpTriggerPath, remoteNasTmpDir);
  });
});