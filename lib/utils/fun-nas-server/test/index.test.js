'use strict';

const util = require('util');
const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const expect = require('expect.js');
const mkdirp = require('mkdirp-promise');
const rimraf = require('rimraf');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
var supertest = require('supertest');

const { getFileHash } = require('../lib/file');

const sandbox = sinon.createSandbox();

const writeFile = util.promisify(fs.writeFile);
const file = {
  unzipFile: sandbox.stub()
};

const index = proxyquire('../index', {
  './lib/file': file
});
const request = supertest(index.app);

describe('GET /tmp/check test', () => {
  const remoteNasTmpDir = path.join(os.tmpdir(), '.fun_nas_tmp');
  afterEach(() => {
    rimraf.sync(remoteNasTmpDir);
    sandbox.reset();
  });

  it('make tmp dir check', (done) => {
    const query = {
      remoteNasTmpDir
    };
    request.get('/tmp/check')
      .query(query)
      .expect(200)
      .expect(
        {
          desc: 'check tmpDir done!'
        }, done);
  });
});
describe('POST /commands test', () => {
  const dirPath = path.join(os.tmpdir(), '.fc-fun-nas-test-dir', '/');
  beforeEach(async () => {
    await mkdirp(dirPath);
    await writeFile(path.join(dirPath, 'test.txt'), 'this is a test');
  });
  afterEach(() => {
    rimraf.sync(dirPath);
    sandbox.reset();
  }); 

  it('invalid cmd test', (done) => {
    const lsPath = path.join(dirPath, 'invalid', '/');
    const query = {};
    const body = { cmd: `ls ${lsPath}` };
    
    request.post('/commands')
      .send(body)
      .query(query)
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.key('error');
        done();
      });
  });

  it('valid cmd test', (done) => {
    const query = {};
    const body = { cmd: `ls ${dirPath}` };
    
    request.post('/commands')
      .send(body)
      .query(query)
      .set('Accept', 'application/json')
      .expect(200)
      .expect({stdout: 'test.txt\n', stderr: ''}, done);
  });
});

describe('GET /stats test', () => {
  const dirPath = `${os.tmpdir()}/.stats/`;
  let uid;
  let gid;
  let mode;
  beforeEach(async () => {
    await mkdirp(dirPath);
    const stats = await fs.lstat(dirPath);
    uid = stats.uid;
    gid = stats.gid;
    mode = stats.mode;
  });
  afterEach(() => {
    rimraf.sync(dirPath);
    sandbox.reset();
  }); 

  it('path exist test', (done) => {
    const query = { dstPath: dirPath};
    request.get('/stats')
      .query(query)
      .expect(200)
      .expect(
        {
          path: dirPath,
          exists: true,
          isDir: true,
          parentDirExists: true,
          isFile: false, 
          UserId: uid, 
          GroupId: gid, 
          mode: mode
        }, done);
  });

  it('path not exist test', (done) => {
    const notExistPath = path.join(dirPath, 'notExist');
    const query = { dstPath: notExistPath };
    request.get('/stats')
      .query(query)
      .expect(200)
      .expect(
        {
          path: notExistPath,
          exists: false,
          isDir: false,
          parentDirExists: true, 
          isFile: false
        }, done);
  });

  it('path empty test', (done) => {
    const emptyPath = '';
    const query = { dstPath: emptyPath };

    request.get('/stats')
      .query(query)
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.eql({ error: 'missing dstPath parameter' });
        done();
      });
  });
});


describe('GET /file/check', () => {
  const fileDir = path.posix.join(os.tmpdir(), '.checkPath');
  const filePath = path.posix.join(fileDir, 'test.file');
  let fileHash;

  beforeEach(async() => {
    await mkdirp(fileDir);
    await writeFile(filePath, 'this is a test');
    fileHash = await getFileHash(filePath);
  });
  afterEach(() => {
    rimraf.sync(fileDir);
    sandbox.reset();
  });

  it('hash unchanged', (done) => {
    const nasFile = filePath;

    const query = {
      nasFile, 
      fileHash
    };
    request.get('/file/check')
      .query(query)
      .expect(200)
      .expect({
        stat: 1, 
        desc: 'File saved'
      }, done);
  }); 

  it('hash changed', (done) => {
    const nasFile = filePath;
    const changedFileHash = 1;
    const query = {
      nasFile, 
      fileHash: changedFileHash
    };
    request.get('/file/check')
      .query(query)
      .expect(200)
      .expect(
        {
          error: 'file hash changes, you need to re-sync'
        }, done);
  }); 
});

describe('POST /file/chunk/upload', () => {
  const nasDir = path.posix.join(os.tmpdir(), '.chunkUpload');
  const nasFile = path.posix.join(nasDir, 'nasFile');
  const fileStart = 0;
  const chunkBuf = Buffer.alloc(10);

  beforeEach(async() => {
    await mkdirp(nasDir);
    await writeFile(nasFile, Buffer.alloc(20));
  });
  afterEach(() => {
    rimraf.sync(nasDir);
    sandbox.reset();
  });

  it('chunk upload test', (done) => {
    const query = {
      nasFile, 
      fileStart
    };
    request.post('/file/chunk/upload')
      .send(chunkBuf)
      .query(query)
      .set('Content-Type', 'application/octet-stream')
      .expect(200)
      .expect({ desc: 'chunk file write done' }, done);
  });
});

