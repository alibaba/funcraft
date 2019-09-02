'use strict';
const util = require('util');
const os = require('os');
const fs = require('fs');

const mkdirp = require('mkdirp-promise');
const rimraf = require('rimraf');
const writeFile = util.promisify(fs.writeFile);

const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const constants = require('../../lib/nas/constants');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

const upload = sandbox.stub();

const cpStub = proxyquire('../../lib/nas/cp', {
  './cp/upload': upload
});

describe('nas cp test', () => {
  const localNotEmptyPath = path.join(os.tmpdir(), '.not-empty-dir'); 
  const localEmptyPath = path.join(os.tmpdir(), '.empty-dir'); 
  const filePath = path.join(localNotEmptyPath, 'test.txt');
  beforeEach(async () => {
    await mkdirp(localEmptyPath);
    await mkdirp(localNotEmptyPath);
    await writeFile(`${filePath}`, 'this is a test');
  });

  afterEach(() => {
    rimraf.sync(localEmptyPath);
    rimraf.sync(localNotEmptyPath);
    sandbox.reset();
  });

  it('local path cp to nas path test', async() => {
    
    const srcPath = filePath;
    const dstPath = 'nas://fun-nas-test:/mnt/nas';
    
    await cpStub(srcPath, dstPath, false);
    const mntDir = path.posix.join('/', 'mnt', 'nas');
    const nasHttpTriggerPath = `/proxy/${constants.FUN_NAS_SERVICE_PREFIX}fun-nas-test/fun-nas-function/`;
    assert.calledWith(upload, srcPath, mntDir, nasHttpTriggerPath, false);
    
  });

  it('src path undefined test', async () => {
    const srcPath = undefined;
    const dstPath = 'nas://fun-nas-test:/mnt/nas';

    await cpStub(srcPath, dstPath, false);
    
    assert.notCalled(upload);
  });

  it('local src path is a empty dir test', async () => {
    const srcPath = localEmptyPath;
    const dstPath = 'nas://fun-nas-test:/mnt/nas';
    
    await cpStub(srcPath, dstPath, true);

    assert.notCalled(upload);
    
  });

});