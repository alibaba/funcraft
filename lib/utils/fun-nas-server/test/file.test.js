'use strict';

const util = require('util');
const os = require('os');
const fs = require('fs');

const path = require('path');
const expect = require('expect.js');
const mkdirp = require('mkdirp-promise');
const rimraf = require('rimraf');


const file = require('../lib/file');

const writeFile = util.promisify(fs.writeFile);

//test.file.zip中的文件名为 test.file, 其权限为 -rwxrwxrwx , 对应 fs.stat.mode === 33279
const unzipDst = path.join(__dirname, 'unzip-folder');
describe('file.js test', () => {
  const dirName = path.join(os.tmpdir(), '.file', '/');
  const filePath = path.join(dirName, 'test.file');

  beforeEach(async () => {
    await mkdirp(dirName);
    await mkdirp(unzipDst);
    await writeFile(filePath, 'this is a test');
  });

  afterEach(() => {
    rimraf.sync(dirName);
    rimraf.sync(unzipDst);
  });
  

  it('function writeBufToFile resolve test', async () => {
    const data = new Buffer('this is a test 123');
    let res = await file.writeBufToFile(filePath, data);
    expect(res).to.be.empty;  
  });

  it('function writeBufToFile reject test', async () => {
    const data = new Buffer('this is a test 123');
    try {
      await file.writeBufToFile(dirName, data);
    } catch (error) {
      expect(error).to.be.an(Error);
    }
  });
  it('function isDir true test', async() => {
    const res = await file.isDir(dirName);
    expect(res).to.eql(true);
  });
  it('function isDir false test', async() => {
    const res = await file.isDir(filePath);
    expect(res).to.eql(false);
  });
  it('function isFile true test', async() => {
    const res = await file.isFile(filePath);
    expect(res).to.eql(true);
  });
  it('function isFile false test', async() => {
    const res = await file.isFile(dirName);
    expect(res).to.eql(false);
  });
  it('function exists true test', async() => {
    const res = await file.exists(dirName);
    expect(res).to.eql(true);
  });
  it('function exists false test', async() => {
    const localNotExistPath = path.join(dirName, '.not-exist-path');
    const res = await file.exists(localNotExistPath);
    expect(res).to.eql(false);
  });
});