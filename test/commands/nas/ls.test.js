'use strict';


const expect = require('expect.js');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const sandbox = sinon.createSandbox();
const assert = sinon.assert;
const path = require('path');
const mockdata = require('./mock-data');
const lsNasFile = sandbox.stub();
const validate = sandbox.stub();

const tpl = {
  detectTplPath: sandbox.stub(), 
  getTpl: sandbox.stub()
};
const init = {
  deployNasService: sandbox.stub()
};
const lsStub = proxyquire('../../../lib/commands/nas/ls', {
  '../../validate/validate': validate,
  '../../nas/ls': lsNasFile,
  '../../tpl': tpl, 
  '../../nas/init': init
});

describe('command ls test', () => {
  const options = 
    {
      all: true, 
      long: true
    };
  beforeEach(() => {
    tpl.detectTplPath.returns('/template.yml');
    tpl.getTpl.returns(mockdata.tpl);
  });
  
  afterEach(() => {
    sandbox.reset();
  });
    
  it('valid nas path', async () => {
    const nasPath = 'nas://demo/mnt/nas';

    await lsStub(nasPath, options);
    const mntDir = path.posix.join('/', 'mnt', 'nas');
    assert.calledWith(lsNasFile, 'demo', mntDir, options.all, options.long);
  });

  it('valid nas path with short nasPath', async () => {
    const nasPath = 'nas:///mnt/nas';

    await lsStub(nasPath, options);
    const mntDir = path.posix.join('/', 'mnt', 'nas');
    assert.calledWith(lsNasFile, mockdata.serviceName, mntDir, options.all, options.long);
  });

  it('invalid nas path', async () => {
    const nasPath = '://demo//mnt/nas';
    let err;

    try {
      await lsStub(nasPath, options);
      assert.notCalled(lsNasFile);
    } catch (error) {
      err = error;
    }
    expect(err).to.eql(new Error('nas path err: ' + nasPath));
    
  });
});

