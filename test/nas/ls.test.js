'use strict';


const sinon = require('sinon');
const getNasHttpTriggerPath = require('../../lib/nas/request').getNasHttpTriggerPath;
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const proxyquire = require('proxyquire');


describe('ls test', () => {
  const serviceName = 'demo';
  const nasPath = '/mnt/nas';
  const isAllOpt = true;
  const isLongOpt = true;
  
  let ls;
  
  let request;
  beforeEach(() => {
    
    request = {
      sendCmdReqequest: sandbox.stub().returns({
        data: '123',
        stderr: ''
      })
    };
    ls = proxyquire('../../lib/nas/ls', {
      './request': request
    });
    
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('ls function test', async () => {
    await ls(serviceName, nasPath, isAllOpt, isLongOpt);
    const nasHttpTriggerPath = await getNasHttpTriggerPath(serviceName);
    const cmd = 'ls -a -l /mnt/nas';
    assert.calledWith(request.sendCmdReqequest, nasHttpTriggerPath, cmd);
    
  });
});