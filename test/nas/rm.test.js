'use strict';


const sinon = require('sinon');
const path = require('path');
const getNasHttpTriggerPath = require('../../lib/nas/request').getNasHttpTriggerPath;
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const proxyquire = require('proxyquire');


describe('ls test', () => {
  const serviceName = 'demo';
  const nasPath = path.posix.join('/', 'mnt', 'nas');
  const isRecursiveOpt = true;
  const isForceOpt = true;
  
  let rm;
  
  let request;
  beforeEach(() => {
    
    request = {
      sendCmdRequest: sandbox.stub().returns({
        data: '123',
        stderr: ''
      })
    };
    rm = proxyquire('../../lib/nas/rm', {
      './request': request
    });
    
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('rm function test', async () => {
    await rm(serviceName, nasPath, isRecursiveOpt, isForceOpt);
    const nasHttpTriggerPath = await getNasHttpTriggerPath(serviceName);
    const cmd = `rm -R -f ${nasPath}`;
    assert.calledWith(request.sendCmdRequest, nasHttpTriggerPath, cmd);
    
  });
});