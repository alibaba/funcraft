'use strict';

const expect = require('expect.js');
const sinon = require('sinon');
const constants = require('../../lib/nas/constants');
const FC = require('@alicloud/fc2');
const proxyquire = require('proxyquire');
const { setProcess } = require('../test-utils');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;


describe('request test', () => {
  let request;
  let fcRequest;
  let cpFile;
  const dstPath = '/nas';
  const fileHashValue = '123';
  const nasFile = 'nasFile';
  const body = Buffer.alloc(10);
  
  const nasServiceName = constants.FUN_NAS_SERVICE_PREFIX + 'demo';
  const cmd = 'ls';
  const nasHttpTriggerPath = `/proxy/${nasServiceName}/${constants.FUN_NAS_FUNCTION}/`;
  let restoreProcess;
  
  beforeEach(() => {
    cpFile = {
      readFileChunk: sandbox.stub()
    };
    cpFile.readFileChunk.returns(body);
    fcRequest = sandbox.stub(FC.prototype, 'request');
    fcRequest.resolves('fcRequestRes');
    restoreProcess = setProcess({
      ACCOUNT_ID: 'ACCOUNT_ID',
      DEFAULT_REGION: 'cn-shanghai',
      ACCESS_KEY_ID: 'ACCESS_KEY_ID',
      ACCESS_KEY_SECRET: 'ACCESS_KEY_SECRET'
    });

    request = proxyquire('../../lib/nas/request', {
      '@alicloud/fc2': FC,
      './cp/file': cpFile
    });
    
  }); 

  afterEach(() => {
    restoreProcess();
    sandbox.restore();
  });

  it('sendCmdRequest function test', async () => {
    
    const cmd = 'ls';

    let res = await request.sendCmdRequest(nasHttpTriggerPath, cmd);
    assert.calledWith(fcRequest, 'POST', nasHttpTriggerPath + 'commands', {}, { cmd }, {'X-Fc-Log-Type': 'Tail'}, {});
    expect(res).to.eql('fcRequestRes');
  });

  it('sendCmdRequest function throw err test', async () => {
    
    fcRequest.throws(new Error('send cmd error'));

    try {
      await request.sendCmdRequest(nasHttpTriggerPath, cmd);
      assert.calledWith(fcRequest, 'POST', nasHttpTriggerPath + 'commands', { cmd }, undefined, {'X-Fc-Log-Type': 'Tail'}, {});
    } catch (error) {
      expect(error).to.eql(new Error('send cmd error'));
    }
  });
  
  it('statsRequest function test', async() => {
 
    let res = await request.statsRequest(dstPath, nasHttpTriggerPath);
    assert.calledWith(fcRequest, 'GET', nasHttpTriggerPath + 'stats', { dstPath }, undefined, {'X-Fc-Log-Type': 'Tail'}, {});
    expect(res).to.eql('fcRequestRes');
    
  });

  it('checkFileHash function test', async() => {
    let res = await request.checkFileHash(nasHttpTriggerPath, nasFile, fileHashValue);
    assert.calledWith(fcRequest, 'GET', nasHttpTriggerPath + 'file/check', {
      nasFile,
      fileHash: fileHashValue
    }, undefined, {'X-Fc-Log-Type': 'Tail'}, {});
    expect(res).to.eql('fcRequestRes');

  });

  it('createSizedNasFile function test', async() => {

    let res = await request.createSizedNasFile(nasHttpTriggerPath, nasFile, 1000);
    const cmd = `dd if=/dev/zero of=${nasFile} count=0 bs=1 seek=1000`;
    assert.calledWith(fcRequest, 'POST', nasHttpTriggerPath + 'commands', {}, { cmd }, {'X-Fc-Log-Type': 'Tail'}, {});
    expect(res).to.eql('fcRequestRes');

  });

  it('uploadChunkFile function test', async() => {
    let res = await request.uploadChunkFile(nasHttpTriggerPath, nasFile, 'zipFilePath', { start: 0, size: 10});
    const query = {
      nasFile, 
      fileStart: '0'
    };
    
    assert.calledWith(cpFile.readFileChunk, 'zipFilePath', 0, 10);
    assert.calledWith(fcRequest, 'POST', nasHttpTriggerPath + 'file/chunk/upload', query, body, {'X-Fc-Log-Type': 'Tail'}, {});
    expect(res).to.eql('fcRequestRes');
  });

});
