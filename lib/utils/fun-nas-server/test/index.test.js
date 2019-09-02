'use strict';

const util = require('util');
const os = require('os');
const fs = require('fs');
const path = require('path');
const expect = require('expect.js');
const mkdirp = require('mkdirp-promise');
const md5File = require('md5-file/promise');
const rimraf = require('rimraf');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
var supertest = require('supertest');

const { writeBufToFile, getFileHash } = require('../../../utils/fun-nas-server/lib/file');
const splitFile = require('../../../nas/cp/file').splitFile;

const sandbox = sinon.createSandbox();

const writeFile = util.promisify(fs.writeFile);
const file = {
  unzipFile: sandbox.stub()
};
const index = proxyquire('../index', {
  './lib/file': file
});
const request = supertest(index.app);

describe('POST /commands test', () => {
  const dirPath = path.join(os.tmpdir(), '.fc-fun-nas-test-dir', '/');
  beforeEach(async () => {
    await mkdirp(dirPath);
    await writeFile(path.join(dirPath, 'test.txt'), 'this is a test');
  });
  afterEach(() => {
    rimraf.sync(dirPath);
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
  beforeEach(async () => {
    await mkdirp(dirPath);
  });
  afterEach(() => {
    rimraf.sync(dirPath);
  }); 

  it('path exist test', (done) => {
    const query = { dstPath: dirPath};
    request.get('/stats')
      .query(query)
      .expect(200)
      .expect(
        {
          path: dirPath,
          isExist: true,
          isDir: true,
          isFile: false
        }, done);
  });

  it('path not exist test', (done) => {
    const notExistPath = path.join(dirPath, 'notExist');
    const query = { dstPath: notExistPath};
    request.get('/stats')
      .query(query)
      .expect(200)
      .expect(
        {
          path: notExistPath,
          isExist: false,
          isDir: false,
          isFile: false
        }, done);
  });

  it('path empty test', (done) => {
    const emptyPath = '';
    const query = { dstPath: emptyPath};

    request.get('/stats')
      .query(query)
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.key('error');
        done();
      });
  });
});

describe('POST /split/merge test', () => {
  const nasTmpDir = path.join(os.tmpdir(), '.tmp', '/');
  const filePath = path.join(os.tmpdir(), '.fun-nas-test-file');
  const dstDir = path.join(os.tmpdir(), '.dst', '/');
  const fileName = 'nasFile';
  let fileHashValue;

  beforeEach(async () => {
    await mkdirp(nasTmpDir);
    await mkdirp(dstDir);
    await writeFile(filePath, Buffer.alloc(10 * 1024 * 1024));
    fileHashValue = await md5File(filePath);

    //split file
    await splitFile(filePath, 5 * 1024 * 1024, nasTmpDir);

    file.unzipFile.resolves();
  });

  afterEach(() => {
    rimraf.sync(nasTmpDir);
    rimraf.sync(filePath);
    rimraf.sync(dstDir);
    sandbox.restore();
  });

  it('successful merge test', (done) => {
    const query = { 
      nasTmpDir, 
      dstDir,
      fileName, 
      fileHashValue
    };
    request.post('/split/merge')
      .query(query)
      .expect(200)
      .expect(
        {
          desc: 'merge success', 
          nasZipFile: path.join(dstDir, fileName)
        }, done);
  });

  it('hash change test', (done) => {
    fileHashValue = 123;
    const query = { 
      nasTmpDir, 
      dstDir,
      fileName, 
      fileHashValue
    };

    request.post('/split/merge')
      .query(query)
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.key('error');
        done();
      });
      
  });
});

describe('POST /uploads test', () => {
  const fileBuf = Buffer.from('this is a test');
  //const fileBuf = { buf: 'this is a test'};
  const dstDir = path.join(os.tmpdir(), '.upload', '/');
  const fileName = 'nas';
  const nasFile = path.join(dstDir, fileName);
  let fileHashValue;
  beforeEach(async () => {
    await mkdirp(dstDir);
    await writeBufToFile(nasFile, fileBuf);
    fileHashValue = await getFileHash(nasFile);
  });
  afterEach(() => {
    rimraf.sync(dstDir);
  });
  it('hash change test', (done) => {
    fileHashValue = 123;
    const query = {
      dstDir, 
      fileHashValue, 
      fileName
    };
    
    request.post('/uploads')
      .send(fileBuf)
      .query(query)
      .set('Content-Type', 'application/octet-stream')
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect({ error: 'file hash changes, you need to re-sync' }, done);
  });

  it('successful upload test', (done) => {
    
    const query = {
      dstDir, 
      fileHashValue, 
      fileName
    };
    request.post('/uploads')
      .send(fileBuf)
      .query(query)
      .set('Content-Type', 'application/octet-stream')
      .expect(200)
      .expect({stat: 1, desc: 'Folder saved' }, done);
  });

});

describe('POST /split/uploads', () => {
  const nasTmpDir = path.join(os.tmpdir(), '.split-tmp', '/');
  const fileName = 'nas';
  let fileHashValue;
  
  const body = Buffer.from('this is a test');
  beforeEach(async () => {
    await mkdirp(nasTmpDir);
  });

  afterEach(() => {
    rimraf.sync(nasTmpDir);
  });

  it('hash change test', (done) => {
    fileHashValue = 123;
    const query = {
      fileName, 
      nasTmpDir, 
      fileHashValue
    };
    request.post('/split/uploads')
      .send(body)
      .query(query) 
      .set('Content-Type', 'application/octet-stream')
      .expect(200)
      .expect(
        {
          error: 'splited file hash is not match, please reSync the file.'
        }, done);
  });
}); 

describe('GET /nas/stats', () => {
  const fileHashValue = 123;
  const fileName = 'nas';
  const dstDir = `${os.tmpdir()}/.nasStat/`;
  const tmpDir = path.join(dstDir, '.fun_nas_tmp', `${fileHashValue}`);
  
  beforeEach(async () => {
    await mkdirp(dstDir);
  });

  afterEach(() => {
    rimraf.sync(dstDir);
  });

  it('tmp dir not exist', (done) => {
    const query = {
      fileHashValue, 
      fileName, 
      dstPath: dstDir
    };
    
    request.get('/nas/stats')
      .query(query)
      .expect(200)
      .expect({
        nasTmpDir: tmpDir,
        dstDir: dstDir,
        uploadedSplitFiles: {}
      }, done);
  });
  
  it('tmp dir exist', async () => {
    const query = {
      fileHashValue, 
      fileName, 
      dstPath: dstDir
    };
    await mkdirp(tmpDir);
    await writeFile(path.join(tmpDir, 'test.file'), 'this is a test');
    let nasFileHash = await md5File(path.join(tmpDir, 'test.file'));
    
    let uploadedSplitFiles = { 'test.file': nasFileHash};
    await request.get('/nas/stats')
      .query(query)
      .expect(200)
      .expect({
        nasTmpDir: tmpDir,
        dstDir: dstDir,
        uploadedSplitFiles: JSON.stringify(uploadedSplitFiles)
      });
  });
});