'use strict';

const util = require('util');
const os = require('os');
const fs = require('fs');

const path = require('path');
const expect = require('expect.js');
const mkdirp = require('mkdirp-promise');
const md5File = require('md5-file/promise');
const rimraf = require('rimraf');


const file = require('../lib/file');

const writeFile = util.promisify(fs.writeFile);

describe('file.js test', () => {
  const dirName = `${os.homedir()}/.file/`;
  const filePath = path.join(dirName, 'test.file');
  const fileName = path.basename(filePath);
  let fileHashValue;

  beforeEach(async () => {
    await mkdirp(dirName);
    await writeFile(filePath, 'this is a test');
    fileHashValue = await md5File(filePath);
  });

  afterEach(() => {
    rimraf.sync(dirName);
  });
  
  it('function fileNameAndHash test', async () => {
    let res = await file.fileNameAndHash(filePath);
    expect(res).to.eql(
      {
        fileName: fileName,
        fileHash: fileHashValue
      }
    );
  });

  it('function filesNameAndHash test', async () => {
    let res = await file.filesNameAndHash(dirName);

    expect(res.get(fileName)).to.eql(fileHashValue);
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


});