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
  const isAllOpt = true;
  const isLongOpt = true;
  
  let ls;
  
  let request;
  beforeEach(() => {
    
    request = {
      sendCmdRequest: sandbox.stub().returns({
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
    const nasHttpTriggerPath = getNasHttpTriggerPath(serviceName);
    const cmd = `ls -a -l ${nasPath}`;
    assert.calledWith(request.sendCmdRequest, nasHttpTriggerPath, cmd);
    
  });
});