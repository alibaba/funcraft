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
  const zipDst = path.join(path.dirname(inputPath), `.${path.basename(inputPath)}.zip`);
  let fsExists;
  beforeEach(async () => {
    fsExists = sandbox.spy(fsExtra, 'exists');
    await mkdirp(inputPath);
    await writeFile(path.join(inputPath, 'test.txt'), 'this is a test');
  });
  afterEach(() => {
    inputPath = path.join(os.tmpdir(), '.zip-test', '/');
    rimraf.sync(inputPath);
    rimraf.sync(zipDst);
    sandbox.restore();
  });
    
  it('test zip file exist', async () => {
    
    let res = await file.zipWithArchiver(inputPath);
    assert.calledWith(fsExists, inputPath);
    
    expect(res).to.eql(zipDst);

  });

  it('zip file not exist test', async () => {
    inputPath = path.join(inputPath, 'not-exist');
    try {
      await file.zipWithArchiver(inputPath);
    } catch (error) {
      expect(error).to.eql(new Error('folder not exist: ' + inputPath));
    }
  });
  
  it('test zip file is not folder', async () => {
    inputPath = path.join(inputPath, 'test.txt');
    try {
      await file.zipWithArchiver(inputPath);
    } catch (error) {
      expect(error).to.eql(new Error('zipWithArchiver not support a file'));
    }
  });
});

describe('function splitFile test', () => {
  const dirPath = path.join(os.tmpdir(), '.zip-test', '/'); 
  const filePth = path.join(dirPath, 'test.txt');
  const outPath = path.join(os.tmpdir(), '.output', '/'); 
  const maxFileSize = 512;
  beforeEach(async () => {
    await mkdirp(outPath);
    await mkdirp(dirPath);
    await writeFile(filePth, new Buffer(1024));
  });
  afterEach(() => {
    rimraf.sync(dirPath);
    rimraf.sync(outPath);
    sandbox.restore();
  });

  it('file exist', async () => {
    let res = await file.splitFile(filePth, maxFileSize, outPath);

    expect(res.length).to.eql(2);
    expect(res[0]).to.eql(path.join(outPath, `${path.basename(filePth)}.sf-part1`));
  });
  it('file not exist', async () => {
    const filePathNotExist = path.join(dirPath, 'file');
    try {
      await file.splitFile(filePathNotExist, maxFileSize, outPath);
    } catch (error) {
      expect(error).to.be.an(Error);
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