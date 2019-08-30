'use strict';

const mockdata = require('../commands/nas/mock-data');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const sandbox = sinon.createSandbox();
const expect = require('expect.js');

const tpl = {
  getTpl: sandbox.stub()
};

const supportStub = proxyquire('../../lib/nas/support', {
  '../tpl': tpl
});

describe('getDefaultService test', () => {
  
  afterEach(() => {
    sandbox.reset();
  });

  it('tpl with only one service', async () => {
    tpl.getTpl.returns(mockdata.tpl);
    let res = await supportStub.getDefaultService('tplPath');
    expect(res).to.eql(mockdata.serviceName);
  });

  it('tpl with only none service', async () => {
    tpl.getTpl.returns(mockdata.vpcConfig);
    try {
      await supportStub.getDefaultService('tplPath');
    } catch (error) {
      expect(error).to.eql(new Error('There should be one and only one service in your template.[yml|yaml].'));
    }
  });
});

describe('chunk test', () => {
  after(() => {
    sandbox.restore();
  });
  it('empty arr', () => {
    let res = supportStub.chunk([], 1);
    expect(res).to.eql([]);
  });
  it('not empty arr', () => {
    let res = supportStub.chunk([1, 2, 3], 2);
    expect(res).to.eql([[1, 2], [3]]);
  });
});
