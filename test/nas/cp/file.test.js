'use strict';

const util = require('util');
const os = require('os');
const fs = require('fs');

const mkdirp = require('mkdirp-promise');
const rimraf = require('rimraf');
const writeFile = util.promisify(fs.writeFile);

const fsExtra = require('fs-extra');
const path = require('path');
const sinon = require('sinon');
const expect = require('expect.js');
const file = require('../../../lib/nas/cp/file');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;



describe('function zipWithArchiver test', () => {
  let inputPath = path.join(os.tmpdir(), '.zip-test', '/');
  const localNasTmpDir = path.join(os.tmpdir(), '.nasTmp', '/');

  let fsExists;
  beforeEach(async () => {
    fsExists = sandbox.spy(fsExtra, 'exists');
    await mkdirp(inputPath);
    await mkdirp(localNasTmpDir);
    await writeFile(path.join(inputPath, 'test.txt'), 'this is a test');
  });
  afterEach(() => {
    inputPath = path.join(os.tmpdir(), '.zip-test', '/');
    rimraf.sync(inputPath);
    rimraf.sync(localNasTmpDir);
    sandbox.restore();
  });
    
  it('test zip file exist', async () => {
    
    await file.zipWithArchiver(inputPath, localNasTmpDir);
    assert.calledWith(fsExists, inputPath);
  });

  it('zip file not exist test', async () => {
    inputPath = path.join(inputPath, 'not-exist');
    try {
      await file.zipWithArchiver(inputPath, localNasTmpDir);
    } catch (error) {
      expect(error).to.eql(new Error('folder not exist: ' + inputPath));
    }
  });
  
  it('test zip file is not folder', async () => {
    inputPath = path.join(inputPath, 'test.txt');
    try {
      await file.zipWithArchiver(inputPath, localNasTmpDir);
    } catch (error) {
      expect(error).to.eql(new Error('zipWithArchiver not support a file'));
    }
  });
});


describe('function isEmptyDir test', () => {
  const emptyDir = path.join(os.tmpdir(), '.empty-dir'); 

  beforeEach(async () => {
    await mkdirp(emptyDir);
  });

  afterEach(() => {
    rimraf.sync(emptyDir);
  });

  it('empty dir test', async () => {
    const res = await file.isEmptyDir(emptyDir);
    expect(res).to.eql(res);
  });
});

describe('getFileSize test', () => {
  const tmpDir = path.join(os.tmpdir(), '.file-size', '/');
  const filePath = path.join(tmpDir, 'test.txt');
  beforeEach(async () => {
    await mkdirp(tmpDir);
    await writeFile(filePath, Buffer.alloc(10));
  });
  afterEach(() => {
    rimraf.sync(tmpDir);
  });
  it('test', async() => {
    const fileSize = await file.getFileSize(filePath);
    expect(fileSize).to.eql(10);
  });
});

describe('readFileChunk test', () => {
  const tmpDir = path.join(os.tmpdir(), '.chunk-file', '/');
  const filePath = path.join(tmpDir, 'test.txt');
  beforeEach(async () => {
    await mkdirp(tmpDir);
    await writeFile(filePath, Buffer.alloc(10));
  });
  afterEach(() => {
    rimraf.sync(tmpDir);
  });
  it('test', async() => {
    const chunkBuf = await file.readFileChunk(filePath, 0, 3);
    expect(chunkBuf).to.be.Buffer;
  });
});