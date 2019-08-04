'use strict';

//const ls = require('../../lib/nas/ls');
const FC = require('@alicloud/fc2');
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

  let fcRequest;
  let ls;
  beforeEach(() => {
    fcRequest = sandbox.stub(FC.prototype, 'request').resolves({
      data: '123',
      stderr: ''
    });
    
    ls = proxyquire('../../lib/nas/ls', {
      '@alicloud/fc2': FC
    });
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('ls function test', async () => {
    await ls(serviceName, nasPath, isAllOpt, isLongOpt);
    const nasHttpTriggerPath = await getNasHttpTriggerPath(serviceName);
    const cmd = 'ls -a -l /mnt/nas';
    assert.calledWith(fcRequest, 'POST', nasHttpTriggerPath + 'commands', { cmd }, undefined, {'X-Fc-Log-Type': 'Tail'}, {});
    
  });
});