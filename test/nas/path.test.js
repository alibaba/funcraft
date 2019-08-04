'use strict';

const os = require('os');

const mkdirp = require('mkdirp-promise');
const rimraf = require('rimraf');

const expect = require('expect.js');
const USER_HOME = process.env.HOME || process.env.USERPROFILE;
const sinon = require('sinon');
const path = require('path');
const sandbox = sinon.createSandbox();

const { 
  parseNasPath,
  resolveLocalPath, 
  makeTmpDir, 
  splitFiles } = require('../../lib/nas/path');

describe('parseNasPath test', () => {
  it('valid nas path', () => {
    const nasPath = 'nas://demo://mnt/nas';
    let res = parseNasPath(nasPath);
    expect(res).to.eql({nasPath: '/mnt/nas', serviceName: 'demo'});
  });
});

describe('resolveLocalPath test', () => {

  it('path start with ~', () => {
    const localPath = '~/file';
    let res = resolveLocalPath(localPath);
    expect(res).to.eql(`${USER_HOME}/file`);
  });

  it('current dir path', () => {
    sandbox.stub(process, 'cwd').returns('/local');
    const localPath = 'file';
    let res = resolveLocalPath(localPath);
    expect(res).to.eql(path.join(process.cwd(), localPath));
    sandbox.restore();
  });

});

describe('makeTmpDir test', () => {
  const parentDir = os.homedir();
  const tmpDirName = '.fun-nas-tmp';
  const splitDirName = 'split-dir';
  const tmpDir = path.join(parentDir, tmpDirName, splitDirName);
  afterEach(() => {
    rimraf.sync(tmpDir);
  });

  it('tmp dir exist test', async () => {
    await mkdirp(tmpDir);
    let res = await makeTmpDir(parentDir, tmpDirName, splitDirName);
    expect(res).to.eql(tmpDir);
  });

  it('tmp dir not exist test', async () => {
    let res = await makeTmpDir(parentDir, tmpDirName, splitDirName);
    expect(res).to.eql(tmpDir);
  });
});

describe('splitFiles test', () => {
  it('uploadedSplitFilesHash is empty', async () => {
    const uploadedSplitFilesHash = new Map();
    const splitFilePathArr = ['/local/file'];

    let res = await splitFiles(uploadedSplitFilesHash, splitFilePathArr);
    expect(res).to.eql(splitFilePathArr);
  });

  it('uploadedSplitFilesHash not empty', async () => {
    const uploadedSplitFilesHash = new Map();
    uploadedSplitFilesHash.set('test', '123');
    const splitFilePathArr = ['/local/file'];

    let res = await splitFiles(uploadedSplitFilesHash, splitFilePathArr);
    expect(res).to.eql(splitFilePathArr);
  });
  
});