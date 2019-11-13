'use strict';

const util = require('util');
const os = require('os');
const fs = require('fs');

const mkdirp = require('mkdirp-promise');
const rimraf = require('rimraf');
const expect = require('expect.js');
const writeFile = util.promisify(fs.writeFile);
const { getFileHash } = require('../../../lib/nas/cp/file');
const { readDirRecursive } = require('../../../lib/nas/path');
const constants = require('../../../lib/nas/constants');
const { chunk } = require('../../../lib/nas/support');
const path = require('path');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const dstPath = path.posix.join('/', 'mnt', 'nas');
const nasHttpTriggerPath = '/proxy/';
const noClobber = true;
const request = {
  sendUnzipRequest: sandbox.stub(),
  sendCleanRequest: sandbox.stub(), 
  createSizedNasFile: sandbox.stub(), 
  uploadChunkFile: sandbox.stub(),
  checkFileHash: sandbox.stub(), 
  checkRemoteNasTmpDir: sandbox.stub()
};

const uploadStub = proxyquire('../../../lib/nas/cp/upload', {
  '../request': request
});

describe('upload folder test', () => {
  const srcPath = path.join(os.tmpdir(), '.upload-folder-local-nas-dir');
  const localNasTmpDir = path.join(os.tmpdir(), '.upload-folder-nas-tmp');
  const zipFileName = `.fun-nas-generated-${path.basename(srcPath)}.zip`;
  const remoteNasTmpDir = path.posix.join(dstPath, '.fun_nas_tmp');
  const nasZipFile = path.posix.join(remoteNasTmpDir, zipFileName);
  const srcPathFile = path.join(srcPath, 'test-file');
  
  beforeEach(async () => {
    await mkdirp(srcPath);
    await mkdirp(localNasTmpDir);
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
    
  });

  afterEach(() => {
    sandbox.reset();
    rimraf.sync(srcPath);
    rimraf.sync(localNasTmpDir);
  });
  it('upload test', async() => {
    await uploadStub.uploadFolder(srcPath, dstPath, nasHttpTriggerPath, localNasTmpDir, noClobber);
    const subDirs = fs.readdirSync(localNasTmpDir);
    expect(subDirs.length).to.eql(1);
    const srcPathFiles = await readDirRecursive(srcPath);
    
    const filesArrSlicedBySize = chunk(srcPathFiles, constants.FUN_NAS_FILE_COUNT_PER_REQUEST);
  
    assert.calledOnce(request.createSizedNasFile);
    assert.calledOnce(request.uploadChunkFile);
    assert.calledOnce(request.checkFileHash);

    assert.calledWith(request.sendUnzipRequest, nasHttpTriggerPath, dstPath, nasZipFile, filesArrSlicedBySize[0], noClobber);
    assert.calledWith(request.sendCleanRequest, nasHttpTriggerPath, nasZipFile);
    assert.calledWith(request.checkRemoteNasTmpDir, nasHttpTriggerPath, remoteNasTmpDir);
  });
});
describe('upload file test', () => {
  const srcPath = path.join(os.tmpdir(), '.upload-file-local-nas-dir');
  const srcPathFile = path.join(srcPath, 'test-file');
  const fileSize = 2 * constants.FUN_NAS_CHUNK_SIZE;
  let fileHash;
  beforeEach(async() => {
    await mkdirp(srcPath);
    await writeFile(srcPathFile, Buffer.alloc(fileSize));
    fileHash = await getFileHash(srcPathFile);
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
  });
  afterEach(() => {
    sandbox.reset();
    rimraf.sync(srcPath);
  });

  it('upload test', async() => {
    await uploadStub.uploadFile(srcPathFile, dstPath, nasHttpTriggerPath);
    
    assert.calledWith(request.createSizedNasFile, nasHttpTriggerPath, dstPath, fileSize);
    assert.calledTwice(request.uploadChunkFile);
    assert.calledWith(request.checkFileHash, nasHttpTriggerPath, dstPath, fileHash);
  });
});