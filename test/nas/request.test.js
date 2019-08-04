'use strict';

const util = require('util');
const os = require('os');
const fs = require('fs');

const mkdirp = require('mkdirp-promise');
const rimraf = require('rimraf');
const writeFile = util.promisify(fs.writeFile);

const path = require('path');
const fsExtra = require('fs-extra');
const file = require('../../lib/nas/cp/file');
let request = require('../../lib/nas/request');
const expect = require('expect.js');
const sinon = require('sinon');
const constants = require('../../lib/nas/constants');
const FC = require('@alicloud/fc2');
const proxyquire = require('proxyquire');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

describe('request test', () => {
  let fcRequest;
  const dstPath = '/nas';
  const fileHashValue = '123';
  const fileName = 'file';
  
  const nasServiceName = constants.FUN_NAS_SERVICE_PREFIX + 'demo';
  const cmd = 'ls';
  const nasHttpTriggerPath = `/proxy/${nasServiceName}/${constants.FUN_NAS_FUNCTION}/`;

  beforeEach(async () => {
    fcRequest = sandbox.stub(FC.prototype, 'request');
    fcRequest.resolves(undefined);
    request = await proxyquire('../../lib/nas/request', {
      '@alicloud/fc2': FC
    });
    
  }); 

  afterEach(() => {
    sandbox.restore();
  });

  it('sendCmdReqequest function test', async () => {
    
    const cmd = 'ls';

    let res = await request.sendCmdReqequest(nasHttpTriggerPath, cmd);
    assert.calledWith(fcRequest, 'POST', nasHttpTriggerPath + 'commands', { cmd }, undefined, {'X-Fc-Log-Type': 'Tail'}, {});
    expect(res).to.eql(undefined);
  });

  it('sendCmdReqequest function throw err test', async () => {
    
    fcRequest.throws(new Error('send cmd error'));

    try {
      await request.sendCmdReqequest(nasHttpTriggerPath, cmd);
      assert.calledWith(fcRequest, 'POST', nasHttpTriggerPath + 'commands', { cmd }, undefined, {'X-Fc-Log-Type': 'Tail'}, {});
    } catch (error) {
      expect(error).to.eql(new Error('send cmd error'));
    }
  });
  
  it('checkHasUpload function test', async() => {

    let res = await request.checkHasUpload(dstPath, nasHttpTriggerPath, fileHashValue, fileName);
    const query = {
      fileHashValue,
      fileName,
      dstPath
    };
    assert.calledWith(fcRequest, 'GET', nasHttpTriggerPath + 'nas/stats', query, undefined, {'X-Fc-Log-Type': 'Tail'}, {});
    expect(res).to.be.undefined;
  });

  it('statsRequest function test', async() => {
 
    let res = await request.statsRequest(dstPath, nasHttpTriggerPath);
    assert.calledWith(fcRequest, 'GET', nasHttpTriggerPath + 'stats', { dstPath }, undefined, {'X-Fc-Log-Type': 'Tail'}, {});
    expect(res).to.be.undefined;
    
  });

  it('checkFileHash function test', async() => {
    let isNasFile = true;
    let res = await request.checkFileHash(dstPath, nasHttpTriggerPath, fileHashValue, fileName, isNasFile);
    isNasFile = 'true';
    assert.calledWith(fcRequest, 'GET', nasHttpTriggerPath + 'check/file', {
      fileHashValue,
      fileName,
      dstPath,
      isNasFile
    }, undefined, {'X-Fc-Log-Type': 'Tail'}, {});
    expect(res).to.be.undefined;

  });

  it('uploadSplitFile function test', async () => {
    //prepared
    const dirPath = `${os.homedir()}/.uploadSplitFile/`;
    const filePath = path.join(dirPath, fileName);
    await mkdirp(dirPath);
    await writeFile(filePath, 'this is a test');

    const fileHash = await file.getFileHash(filePath);
    const nasTmpDir = '/mnt/nas/tmp';
    const body = await fsExtra.readFile(filePath);
    const query = {
      fileName,
      nasTmpDir,
      fileHashValue: fileHash
    };
    
    let res = await request.uploadSplitFile(nasHttpTriggerPath, nasTmpDir, filePath);
    assert.calledWith(fcRequest, 'POST', nasHttpTriggerPath + 'split/uploads', query, body, {'X-Fc-Log-Type': 'Tail'}, {});
    expect(res).to.be.undefined;
    rimraf.sync(dirPath);
  });

  it('uploadFile function test', async() => {
    //prepared
    const dirPath = `${os.homedir()}/.uploadFile/`;
    const filePath = path.join(dirPath, fileName);
    await mkdirp(dirPath);
    await writeFile(filePath, 'this is a test');
    

    const dstDir = '/mnt/nas';

    let res = await request.uploadFile(filePath, dstDir, nasHttpTriggerPath, fileHashValue, fileName);
    const query = {
      dstDir,
      fileHashValue,
      fileName
    };
    const body = await fsExtra.readFile(filePath);
    assert.calledWith(fcRequest, 'POST', nasHttpTriggerPath + 'uploads', query, body, {'X-Fc-Log-Type': 'Tail'}, {});
    expect(res).to.be.undefined;
    rimraf.sync(dirPath);
  });

});
