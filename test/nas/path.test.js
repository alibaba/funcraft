'use strict';
const os = require('os');
const fs = require('fs-extra');
const rimraf = require('rimraf');
const expect = require('expect.js');
const USER_HOME = require('os').homedir();
const sinon = require('sinon');
const path = require('path');
const sandbox = sinon.createSandbox();

const { 
  parseNasUri,
  resolveLocalPath, 
  readDirRecursive } = require('../../lib/nas/path');

describe('parseNasUri test', () => {
  const validNasPathResultMap = new Map();
  validNasPathResultMap.set('nas:///mnt/auto', {nasPath: '/mnt/auto', serviceName: ''});
  validNasPathResultMap.set('nas://:/mnt/auto', {nasPath: '/mnt/auto', serviceName: ''});
  validNasPathResultMap.set('nas://service1/mnt/auto', {nasPath: '/mnt/auto', serviceName: 'service1'});
  validNasPathResultMap.set('nas://service1/mnt', {nasPath: '/mnt', serviceName: 'service1'});
  validNasPathResultMap.set('nas://service1/home/', {nasPath: '/home/', serviceName: 'service1'});
  validNasPathResultMap.set('nas://service1/home/', {nasPath: '/home/', serviceName: 'service1'});
  validNasPathResultMap.set('nas://service1/home/1', {nasPath: '/home/1', serviceName: 'service1'});
  validNasPathResultMap.set('nas://service1/', {nasPath: '/', serviceName: 'service1'});
  validNasPathResultMap.set('nas://service1:/tmp/', {nasPath: '/tmp/', serviceName: 'service1'});
  validNasPathResultMap.set('nas:///', {nasPath: '/', serviceName: ''});

  const invalidNasPathArr = ['nas://service1/////mnt/auto', 'nas://service1:/mnt////auto', 'nas://service1:/'
    , 'nas://service1/', 'nas://service1:', 'nas://service1:////', 'nas://service1:/tmp/////', 'oss:///mnt/auto'];

  it('valid nas path test', () => {
    validNasPathResultMap.forEach((parseRes, nasPath) => {
      const res = parseNasUri(nasPath);
      expect(res).to.eql(parseRes);
    });
  });

  it('invalid nas path test', () => {
    invalidNasPathArr.map((invalidNasPath) => {
      try {
        parseNasUri(invalidNasPath);
      } catch (error) {
        expect(error).to.be.an.error;
      }
    });
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

describe('readDirRecursive test', () => {
  const parentDir = path.join(os.tmpdir(), '.readDirRecursiveDir');
  const localDir = path.join(parentDir, 'tmp'); 
  const localEmptyDir = path.join(parentDir, 'empty-dir');
  const filePath = path.join(localDir, 'test.txt');
  
  beforeEach(async () => {
    await fs.mkdirp(localDir);
    await fs.mkdirp(localEmptyDir);
    await fs.writeFile(`${filePath}`, 'this is a test');
  });

  afterEach(() => {
    rimraf.sync(parentDir);
    sandbox.restore();
  });

  it('normal path test', async() => {
    const res = await readDirRecursive(parentDir);
    expect(res).to.eql(['tmp/test.txt', 'empty-dir/']);
  });
});
