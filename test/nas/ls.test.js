'use strict';

const ls = require('../../lib/nas/ls');
const FC = require('@alicloud/fc2');
const expect = require('expect.js');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();

describe.skip('ls test', () => {
  const serviceName = 'demo';
  const nasPath = '/mnt/nas';
  const isAllOpt = true;
  const isLongOpt = true;

  beforeEach(() => {
    sandbox.stub(FC.prototype, 'post').returns(undefined);
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('ls function test', async () => {
        
    let res = await ls(serviceName, nasPath, isAllOpt, isLongOpt);
    expect(res).to.eql(undefined);
  });
});