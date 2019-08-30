'use strict';

const util = require('util');
const os = require('os');
const fs = require('fs');

const mkdirp = require('mkdirp-promise');
const rimraf = require('rimraf');

const writeFile = util.promisify(fs.writeFile);

const expect = require('expect.js');
let execute = require('../lib/execute');


describe('execute ls command test.', () => {
  beforeEach(async () => {
    await mkdirp(`${os.tmpdir()}/.fc-fun-nas-test-dir/`);
    await writeFile(`${os.tmpdir()}/.fc-fun-nas-test-dir/test.txt`, 'this is a test');
  });
  afterEach(() => {
    rimraf.sync(`${os.tmpdir()}/.fc-fun-nas-test-dir/`);
  });
  it('valid ls command test', async () => {
    const lsPath = `${os.tmpdir()}/.fc-fun-nas-test-dir/`;
    const cmd = `ls ${lsPath}`;

    let res = await execute(cmd);

    expect(res).to.eql(
      {
        stdout: 'test.txt\n',
        stderr: ''
      }
    );
  });

  it('invalid ls command test', async() => {
    const lsPath = `${os.tmpdir()}/.fc-fun-nas-test-dir/invalid/`;
    
    const cmd = `ls ${lsPath}`;
    
    try {
      await execute(cmd);
    } catch (error) {
      expect(error);
    }
          
  });
});