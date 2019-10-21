'use strict';


const sinon = require('sinon');
const path = require('path');
const { getNasHttpTriggerPath } = require('../../lib/nas/request');
const mockdata = require('../commands/nas/mock-data');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const proxyquire = require('proxyquire');


describe('ls test', () => {
  const serviceName = 'demo';
  const nasPath = path.posix.join('/', 'mnt', 'nas');
  const isRecursiveOpt = true;
  const isForceOpt = true;
  
  const request = {
    sendCmdRequest: sandbox.stub(), 
    statsRequest: sandbox.stub()
  };
  const rm = proxyquire('../../lib/nas/rm', {
    './request': request
  });
  beforeEach(() => {
    request.sendCmdRequest.returns({
      data: '123',
      stderr: ''
    });
    request.statsRequest.returns({
      headers: 200, 
      data: {
        path: '/mnt/nas',
        exists: true,
        isDir: true,
        isFile: false, 
        UserId: 100, 
        GroupId: 100, 
        mode: 123
      }
    });
  });
  afterEach(() => {
    sandbox.reset();
  });

  it('rm function test', async () => {
    await rm(serviceName, nasPath, isRecursiveOpt, isForceOpt, mockdata.nasId);
    const nasHttpTriggerPath = getNasHttpTriggerPath(serviceName);
    const cmd = `rm -R -f ${nasPath}`;
    assert.calledWith(request.sendCmdRequest, nasHttpTriggerPath, cmd);
    
  });
});