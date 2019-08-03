'use strict';

let request = require('../../lib/nas/request');
const expect = require('expect.js');
const sinon = require('sinon');
const constants = require('../../lib/nas/constants');
const FC = require('@alicloud/fc2');
const proxyquire = require('proxyquire');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

describe('request test', () => {

  beforeEach(async () => {

    sandbox.stub(FC.prototype, 'post').returns(undefined);

    request = await proxyquire('../../lib/nas/request', {
      '@alicloud/fc2': FC
    });
  }); 

  afterEach(() => {
    sandbox.restore();
  });

  it('sendCmdReqequest function test', async () => {
    const nasServiceName = constants.FUN_NAS_SERVICE_PREFIX + 'demo';
    const nasHttpTriggerPath = `/proxy/${nasServiceName}/${constants.FUN_NAS_FUNCTION}/`;
    const cmd = 'ls';

    let res = await request.sendCmdReqequest(nasHttpTriggerPath, cmd);
    assert.calledWith(FC.prototype.post, nasHttpTriggerPath + 'commands', null, null, { cmd }, undefined);
    expect(res).to.eql(undefined);
  });
    
});
