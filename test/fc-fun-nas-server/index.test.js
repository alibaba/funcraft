'use strict';

const util = require('util');
const os = require('os');
const fs = require('fs');

const expect = require('expect.js');
const mkdirp = require('mkdirp-promise');
const rimraf = require('rimraf');

const writeFile = util.promisify(fs.writeFile);

var supertest = require('supertest');
const index = require('../../lib/fc-utils/fc-fun-nas-server/index');
const request = supertest(index.app);


describe('POST /commands test', () => {

  beforeEach(async () => {
    await mkdirp(`${os.homedir()}/.fc-fun-nas-test-dir/`);
    await writeFile(`${os.homedir()}/.fc-fun-nas-test-dir/test.txt`, 'this is a test');
  });
  afterEach(() => {
    rimraf.sync(`${os.homedir()}/.fc-fun-nas-test-dir/`);
  }); 

  it('invalid cmd test', (done) => {
    const lsPath = `${os.homedir()}/.fc-fun-nas-test-dir/invalid/`;
    const query = { cmd: `ls ${lsPath}` };
    request.post('/commands')
      .query(query)
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.key('error');
        done();
      });
  });

  it('valid cmd test', (done) => {
    
    const lsPath = `${os.homedir()}/.fc-fun-nas-test-dir/`;
    const query = { cmd: `ls ${lsPath}` };
    
    request.post('/commands')
      .query(query)
      .expect(200)
      .expect({stdout: 'test.txt\n', stderr: ''}, done);
  });
});