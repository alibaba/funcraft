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

describe('splitRangeBySize test', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('start > end', () => {
    const res = supportStub.splitRangeBySize(10, 1, 2);
    expect(res).to.be.empty;
  });
  it('start < end', () => {
    
    const res = supportStub.splitRangeBySize(1, 10, 4);
    expect(res).to.eql([{ start: 1, size: 4}, { start: 5, size: 4}, { start: 9, size: 1}]);
  });
  it('chunkSize === 0', () => {
    try {
      supportStub.splitRangeBySize(1, 10, 0);
    } catch (error) {
      expect(error).to.eql(new Error('chunkSize of function splitRangeBySize should not be 0'));
    }
  });
});
