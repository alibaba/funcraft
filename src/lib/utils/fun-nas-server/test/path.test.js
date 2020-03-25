'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const expect = require('expect.js');
const rimraf = require('rimraf');

const { makeTmpDir } = require('../lib/path');

describe('makeTmpDir function test', () => {
  const nasTmpDir = path.join(os.tmpdir(), '.fun_nas_tmp');
  afterEach(() => {
    rimraf.sync(nasTmpDir);
  });

  it('nasTmpDir not exist', async () => {
    await makeTmpDir(nasTmpDir);
    const stats = await fs.lstat(nasTmpDir);
    expect(stats.mode).to.eql(17407);
  });
});